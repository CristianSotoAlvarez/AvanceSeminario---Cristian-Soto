# DispatchTrack

Aplicación web para seguir, medir y auditar el área de despacho de una planta de alimentos. Se construyó sobre el caso de Agrosuper S.A., donde la salida de un camión depende de que coincidan tres cosas: que el pallet esté armado, que haya andén libre y, si va a exportación, que el SAG lo apruebe tras pasar por el túnel de frío. Cuando una de las tres falla, nadie se entera hasta que el camión ya va tarde.

El sistema registra cada paso y lo publica en vivo a todas las pantallas conectadas, de modo que el jefe de despacho ve el atasco mientras ocurre y no en el informe del día siguiente.

## Qué sigue el sistema

Hay dos flujos que avanzan en paralelo y se cruzan en el andén.

**El camión** recorre once estados desde que se programa hasta que sale de la planta:

```
ESPERADO → EN_PORTERIA → ASIGNADO → EN_CARGA → LISTO → DESPACHADO
                                        ↓
              (exportación)  EN_TUNEL_FRIO → ESPERANDO_SAG → APROBADO_SAG
                                                    ↓
                                             RECHAZADO_SAG
```

`AVERIADO` queda fuera de esa cadena: lo aplica el flujo de incidentes desde cualquier punto, y permite sustituir el camión averiado por otro que hereda el estado que corresponda.

Las transiciones están validadas en el backend (`apps/api/src/camiones/maquina-estados.ts`), no en la interfaz. Un cliente que invente una transición recibe un 400.

**El pallet** va del picking a la carga: un pickinero lo arma con los productos de la entrega, lo cierra, y un cargador lo sube al camión. El tiempo de armado se calcula solo y alimenta los indicadores.

## Roles

Nueve perfiles, cada uno con su propia área de la aplicación:

| Rol | Hace |
|---|---|
| `JEFE_DESPACHO` | Ve todo, configura usuarios y permisos |
| `COORDINADOR_TRANSPORTE` | Programa camiones y mantiene el catálogo |
| `COORDINADOR` | Asigna andenes, reordena paradas |
| `SUPERVISOR` | Resuelve excepciones en planta |
| `PORTERO` | Registra la llegada del camión |
| `PICKINERO` | Arma pallets |
| `CARGADOR` | Carga pallets al camión |
| `OPERADOR_TUNEL` | Gestiona el túnel de frío y la temperatura |
| `SAG` | Inspecciona camiones de exportación |

Los permisos se definen una sola vez en `packages/types/src/roles.ts` y los consumen tanto los decoradores `@Roles` de la API como las guardas de ruta del frontend. Una prueba falla si esa lista se separa del enum de Prisma.

## Estructura

Monorepo con Turborepo:

```
apps/
  api/          NestJS 10, Prisma 6, PostgreSQL. 16 módulos de dominio.
  web/          Next.js 15 (App Router), React 19, Tailwind 4.
packages/
  types/        Roles, estados y sus colores. Compartido por ambas apps.
  ui/           Componentes del design system (tabla, badge, card, input).
docs/           Documentación del sistema, el diseño y el manual de usuario.
```

La API expone REST bajo `/api/v1` y un canal WebSocket en el namespace `/eventos`. Redis actúa como adaptador de Socket.IO, así que los eventos llegan a todas las pantallas aunque la API corra en varias instancias.

El modelo de datos son 22 tablas. `EventoCamion` es de solo escritura: cada cambio de estado deja una fila con quién, cuándo y qué nota, y es lo que permite reconstruir la trazabilidad de un despacho meses después.

## Puesta en marcha

Necesitas Node 20, PostgreSQL y Redis. Con Docker Compose levantas los dos últimos:

```bash
docker compose up -d        # postgres y redis
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm run --workspace @dispatch-track/api prisma:generate
npm run --workspace @dispatch-track/api prisma:migrate
npm run --workspace @dispatch-track/api prisma:seed
npm run dev
```

La API queda en `localhost:3001` y la web en `localhost:3000`. En desarrollo hay Swagger en `localhost:3001/docs`; en producción está desactivado a propósito.

Para probar con volumen realista, `npm run --workspace @dispatch-track/api generar-datos:demo` genera 180 días de operación con la estacionalidad del caso real.

## Variables de entorno

La API no arranca en producción si falta alguna de estas, o si los secretos tienen menos de 32 caracteres:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | PostgreSQL |
| `REDIS_URL` | Adaptador de Socket.IO |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Firma de los dos tokens |
| `QR_HMAC_SECRET` | Firma de los códigos QR de portería |
| `FRONTEND_URL` | Origen permitido por CORS |

El frontend solo necesita `NEXT_PUBLIC_API_URL`.

## Predicción de riesgo

Dos árboles de decisión avisan, cuando el camión entra a planta, de qué probabilidad tiene de salir tarde o incompleto y de que el SAG lo rechace. Se entrenan en Python con scikit-learn (`apps/api/ml/entrenar_modelos.py`), se exportan como reglas en JSON y se evalúan en TypeScript, así que producción no necesita Python.

El modelo de riesgo SAG acierta un 99,6% sobre 6.027 casos. El de riesgo OTIF es deliberadamente desequilibrado: recupera el 96% de los camiones que acabarán incumpliendo a cambio de muchas falsas alarmas (precisión 0,34). Para un jefe de despacho es la elección correcta, porque el costo de revisar un camión que iba bien es mucho menor que el de perder uno que iba mal.

Las métricas completas están en `docs/informe/modelo-prediccion/reporte-metricas.md`.

## Calidad

```bash
npm run lint         # ESLint sobre todo el monorepo
npm run typecheck    # tsc --noEmit en los cuatro proyectos
npm test             # 90 pruebas
npm run build        # nest build + next build
```

Las pruebas se concentran donde más duele equivocarse: la máquina de estados, las guardas de concurrencia de camiones, túneles y pallets, la validación de tokens QR y el cálculo de los indicadores. Para comprobar que las de concurrencia sirven de algo, se desactivaron las guardas a propósito y se verificó que fallan con el código roto.

## Despliegue

Dos servicios en Railway, cada uno con su Dockerfile en la raíz y su `railway.toml` dentro de `apps/`. El de la API sincroniza el esquema al arrancar y luego levanta el servidor. PostgreSQL y Redis son servicios gestionados del mismo proyecto.

## Documentación

| Documento | Contenido |
|---|---|
| `docs/informe/descripcion-sistema-completo.md` | Arquitectura, modelo de datos y todas las funcionalidades |
| `docs/informe/bitacora-cambios.md` | Qué se construyó en cada etapa y por qué |
| `docs/informe/diagramas.md` | MER, máquinas de estado y flujo operativo en Mermaid |
| `docs/informe/auditoria-codigo.md` | Defectos encontrados y corregidos, con los que se dejaron abiertos |
| `docs/informe/dataset-y-modelo-predictivo.md` | Construcción del dataset y decisiones del modelo |
| `docs/manual/manual-usuario.md` | Manual paso a paso por rol |
| `docs/reportes/guia-kpis.md` | Qué mide cada indicador y cómo se calcula |
| `docs/diseno/` | Especificaciones de diseño previas a cada funcionalidad |

---

Proyecto de seminario de título. Escuela de Ingeniería Informática, Pontificia Universidad Católica de Valparaíso.
