# Auditoría de código — DispatchTrack

**Fecha:** 2 de octubre de 2026
**Alcance:** API (NestJS, ~4.800 líneas) y aplicación web (Next.js, 47 archivos).
**Línea base:** ambos proyectos compilaban sin errores y las 37 pruebas existentes pasaban.
**Resultado:** 10 defectos corregidos, 2 reportados sin corregir (requieren una decisión de producto), 6 pruebas de regresión nuevas.

---

## 1. Seguridad

### 1.1 Contraseña de producción a un commit de distancia (crítico)

Un archivo de configuración local de herramientas contenía en texto plano la contraseña real de la base de datos de producción y **estaba versionado**. No llegó a publicarse —`git log -S` sobre el historial no encuentra la cadena—, pero cualquier `git commit -a` la habría subido al repositorio.

**Corrección:** se sacó del control de versiones (`git rm --cached`). El directorio ya figuraba en `.gitignore`, pero eso no afecta a archivos ya trackeados, que es exactamente por lo que seguía ahí.

### 1.2 Endpoints sin control de rol

| Endpoint | Antes | Riesgo |
|---|---|---|
| `GET /usuarios/:id` | cualquier usuario autenticado | Exposición de RUT, correo y rol de cualquier persona |
| `POST /entregas` | cualquier usuario autenticado | Creación de entregas por roles operativos |
| `DELETE /entregas/:id` | cualquier usuario autenticado | Borrado en cascada de ítems y desvinculación de pallets |

**Corrección:** `GET /usuarios/:id` queda restringido a `JEFE_DESPACHO` y `COORDINADOR` (el frontend no lo consumía, no hubo regresión de interfaz). Las escrituras sobre entregas quedan restringidas a los cuatro roles de gestión; las lecturas siguen abiertas porque picking y carga las necesitan.

### 1.3 Secreto de firma de QR sin validar en producción

`QrService` cae a un secreto por defecto escrito en el propio repositorio si falta `QR_HMAC_SECRET`. La validación de arranque (`validarSecretos`) comprobaba `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL` y `FRONTEND_URL`, **pero no `QR_HMAC_SECRET`**. Desplegar sin esa variable permitiría firmar tokens QR válidos a cualquiera con acceso al repositorio y, con ello, confirmar la llegada de cualquier camión.

**Corrección:** `QR_HMAC_SECRET` pasa a ser obligatorio en producción y se somete a la misma comprobación de fortaleza (mínimo 32 caracteres, sin palabras débiles).

### 1.4 Caída (500) en endpoint público por token QR malformado

`crypto.timingSafeEqual` lanza `RangeError` cuando los búferes difieren en longitud. La comparación de firmas lo invocaba directamente, de modo que un token con firma de otro largo producía un error 500 no controlado en `GET /porteria/qr/:token`, que es público.

Además, `parseInt` sobre un timestamp no numérico devuelve `NaN`, y la comparación de expiración `Date.now() - NaN > 24h` evalúa a `false`: un token con timestamp corrupto **superaba** el control de expiración.

**Corrección:** se comparan longitudes antes de `timingSafeEqual` y se valida que el timestamp sea finito. Ambos caminos devuelven ahora 401. Cubierto por pruebas de regresión.

---

## 2. Integridad de datos y concurrencia

### 2.1 Fuga permanente de túnel al sustituir un camión averiado

Al sustituir un camión (avería con acción `SUSTITUIR`), el camión original conservaba su `tunelId` y el túnel quedaba `ocupado = true` para siempre. El camión sustituto arrancaba en `EN_TUNEL_FRIO` sin túnel. El túnel quedaba inutilizable: no podía recibir otro camión **ni marcarse fuera de servicio**, porque esa operación exige `ocupado = false`.

**Corrección:** el camión averiado libera el túnel dentro de la misma transacción y se emite la actualización en tiempo real. El sustituto ingresa por el flujo normal del operador, que es el estado "pendiente" que la interfaz ya sabe mostrar.

### 2.2 Lectura-y-luego-escritura sin condición (4 casos)

El patrón correcto ya existía en el código (`andenes.service` lo usaba con `updateMany` condicional), pero cuatro operaciones críticas verificaban el estado **fuera** de la transacción y luego escribían sin condición:

| Operación | Consecuencia de la carrera |
|---|---|
| `asignarAnden` | Dos coordinadores asignan el mismo andén al mismo tiempo; el segundo pisa al primero |
| `cambiarEstado` (camión) | Doble clic en "Despachar" aplica la transición dos veces y duplica eventos |
| `ingresarTunel` | Sin transacción: dos peticiones reservan dos túneles y uno queda ocupado sin camión |
| `cambiarEstado` (pallet) | Dos operarios reescriben cargador y tiempo de armado |

**Corrección:** en los cuatro casos la condición viaja en el `WHERE` (`updateMany` más verificación de `count`), de modo que la base de datos arbitra la carrera. `ingresarTunel` además pasa a ser transaccional, así una reserva que no llega a asignarse se revierte.

### 2.3 Lectura de temperatura fuera de la transacción

`registrarTemperaturaYSalirTunel` guardaba el `EventoTunel` y **después** invocaba el cambio de estado en otra transacción. Si la transición fallaba, quedaba una medición huérfana y el túnel ocupado.

**Corrección:** `cambiarEstado` acepta ahora un gancho que se ejecuta dentro de su transacción, y el registro de temperatura lo usa. O se guardan ambas cosas, o ninguna.

---

## 3. Corrección funcional

### 3.1 El gráfico de despachos ignoraba el filtro de fechas

La consulta de "Despachos por día" tenía `NOW() - INTERVAL '30 days'` fijo. Elegir 7 días, 90 días o un rango personalizado en la interfaz **no cambiaba el gráfico**, que siempre mostraba los últimos 30 días.

**Corrección:** la consulta usa el rango seleccionado. El otro intervalo fijo de 30 días, el del motor de medianas por edificio, es deliberado y está documentado como tal; se dejó intacto.

### 3.2 Código muerto duplicando una regla viva

`TunelesService.liberarTunelDeCamion` no se invocaba desde ningún sitio: la liberación real estaba replicada dentro de `cambiarEstado`. Dos implementaciones de la misma regla, una de ellas inalcanzable, son una divergencia esperando a ocurrir.

**Corrección:** se eliminó el método muerto.

---

## 4. Frontend

### 4.1 Refrescos de token en estampida

Cuando varias peticiones recibían 401 a la vez (habitual al cargar una pantalla con varios hooks), cada una lanzaba su propio `POST /auth/refresh`. Como el servidor rota la cookie de refresco en cada llamada, las peticiones concurrentes competían y algunas terminaban con un token ya invalidado.

**Corrección:** un único refresco en vuelo; las demás peticiones esperan la misma promesa.

---

## 5. Reportado, no corregido

Estos dos puntos son correctos de señalar, pero su arreglo es una **decisión de producto**, no una corrección mecánica.

### 5.1 Zona horaria: el día operativo no coincide con el día real

El cliente envía la fecha **local** (`use-camiones.ts` usa `getFullYear`/`getMonth`/`getDate`) y el backend la interpreta como **UTC**. En Chile (UTC−3) eso desplaza la ventana tres horas: un camión programado a las 23:00 locales cae en el listado del día siguiente, y aparecen en "hoy" camiones de las 21:00–24:00 del día anterior.

Importa especialmente en este caso porque la planta opera de madrugada y empieza a recibir camiones a las 22:30 del domingo. Además, `porteria.listarCamionesHoy` resuelve lo mismo de otra forma (hora local **del servidor**, que en Railway es UTC), así que los dos módulos pueden discrepar entre sí.

**Por qué no se corrigió:** exige fijar cuál es la zona horaria autoritativa de la planta (una variable `TZ_PLANTA`, o que el cliente envíe su desfase) y afecta a listados de camiones, portería y tablero a la vez. Cambiarlo sin esa decisión alteraría qué camiones aparecen "hoy".

### 5.2 La máquina de estados no describe el camino multiparada

`finalizarCarga` lleva un camión de `EN_CARGA` a `EN_PORTERIA` cuando quedan paradas pendientes, pero esa transición **no existe** en `maquina-estados.ts`. El código la ejecuta saltándose `validarTransicion`.

Hoy no tiene efecto visible: `estadosSiguientes` se expone en la API pero el frontend no lo consume (solo está declarado en el tipo). Si alguna pantalla empezara a usarlo, mostraría opciones incorrectas para camiones multiparada.

**Por qué no se corrigió:** añadir la transición al mapa la habilitaría también para camiones de una sola parada, donde es inválida. La solución correcta es condicionarla a que existan paradas pendientes, lo que cambia la forma del modelo de estados.

---

## 6. Verificación

- `tsc --noEmit` limpio en API y web.
- `nest build` correcto.
- 43 pruebas en verde (37 previas más 6 nuevas de regresión sobre `QrService`).
- Los dos defectos del QR se comprobaron empíricamente contra el comportamiento anterior: `timingSafeEqual` lanzando `RangeError`, y `Date.now() - NaN > 24h` evaluando a `false`.

---

## 7. Lo que esta auditoría no cubre

- No se ejecutaron pruebas de extremo a extremo contra la base de datos de producción.
- No se auditó el rendimiento de las consultas de reportes bajo el volumen real (unos 12.000 camiones).
- La revisión del frontend se concentró en la capa de acceso a la API y el manejo de sesión, no en el comportamiento de cada pantalla.
- No hay pruebas automatizadas para las correcciones de concurrencia: reproducirlas requiere una base de datos real y peticiones en paralelo.
