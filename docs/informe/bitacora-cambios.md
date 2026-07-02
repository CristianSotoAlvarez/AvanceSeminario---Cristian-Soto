# Bitácora de cambios e implementación — DispatchTrack

> **Propósito de este documento.** Es un registro autocontenido de las mejoras y funcionalidades implementadas en el sistema DispatchTrack durante esta etapa del proyecto de título. Está escrito para servir de **insumo de redacción del informe final de seminario**: cada sección describe el problema, la solución, las decisiones de diseño y su justificación, los componentes técnicos afectados y el beneficio esperado. Puede entregarse a una herramienta de asistencia de redacción (p. ej. Cowork) o usarse directamente como base de los capítulos de desarrollo y resultados.

**Fecha de cierre de esta etapa:** 13 de junio de 2026.
**Magnitud del trabajo:** 30 archivos modificados o creados, aproximadamente 1.950 líneas de código agregadas. 4 documentos de diseño formales, 5 documentos de manual/guía.

---

## 1. Resumen ejecutivo

DispatchTrack es un sistema web de **trazabilidad, monitoreo y rendimiento del área de despacho** de una planta de producción de alimentos (caso de estudio inspirado en Agrosuper S.A.). Permite seguir cada camión a lo largo de su ciclo en planta —desde que se programa hasta que es despachado— y a cada pallet desde su armado hasta su carga, registrando responsables, tiempos e incidencias.

En esta etapa el trabajo se concentró en **cerrar las brechas del "camino no feliz"** (qué hace el sistema cuando las cosas salen mal), **mejorar la capa analítica** (reportes y KPIs accionables), **resolver una ambigüedad de roles operativos** y **dotar al sistema de datos realistas** para evidenciar su aporte. Las siete líneas de trabajo fueron:

1. Rediseño de la sección de Reportes y KPIs.
2. Manejo en vivo de avería de camión (reparación o sustitución).
3. Registro de llegada por QR en portería (flujo sin fricción).
4. Clarificación de los roles Pickinero vs. Cargador mediante un modelo de polivalencia.
5. Mejoras de experiencia de usuario (UX) transversales.
6. Manejo de andén fuera de servicio.
7. Generación de un conjunto de datos sintéticos realista (90 días) para resultados.

Todo el trabajo siguió una **metodología disciplinada de diseño previo a la implementación** (ver sección 3).

---

## 2. Contexto del sistema (arquitectura base)

- **Arquitectura:** monorepo gestionado con Turborepo, con dos aplicaciones principales.
  - **API (backend):** NestJS (TypeScript) con Prisma ORM sobre PostgreSQL. Autenticación JWT con doble token (access + refresh). Comunicación en tiempo real mediante WebSockets (gateway de eventos). Redis para coordinación.
  - **Web (frontend):** Next.js 15 (App Router, React 19) con Tailwind CSS v4. Animaciones con Motion. Gráficos con Recharts.
- **Modelo de dominio principal:** `Camion`, `Pedido`, `Entrega`, `EntregaItem`, `Pallet`, `ProductoPallet`, `ParadaExpedicion`, `Anden`, `Edificio`, `Cliente`, `Producto`, `Usuario`, `InspeccionSAG`, `EventoCamion` (registro append-only de cambios de estado).
- **Roles del sistema:** `JEFE_DESPACHO`, `COORDINADOR_TRANSPORTE`, `COORDINADOR`, `SUPERVISOR`, `PICKINERO`, `CARGADOR`, `OPERADOR_TUNEL`, `SAG`, y (nuevo) `PORTERO`.
- **Ciclo de estados del camión:** `ESPERADO → EN_PORTERIA → ASIGNADO → EN_CARGA →` (para exportación: `EN_TUNEL_FRIO → ESPERANDO_SAG → APROBADO_SAG/RECHAZADO_SAG →`) `LISTO → DESPACHADO`. Se agregó el estado terminal `AVERIADO`.

---

## 3. Metodología de trabajo

Cada funcionalidad se desarrolló con un flujo de cuatro fases, lo que aporta rigor metodológico citable en el informe:

1. **Diseño previo (brainstorming dirigido):** antes de escribir código, se exploró el problema mediante preguntas acotadas para definir requisitos, alternativas y criterios de éxito. Se evaluaron 2–3 enfoques por funcionalidad y se justificó la elección.
2. **Especificación formal:** cada decisión quedó registrada en un documento de diseño (`docs/superpowers/specs/`), incluyendo modelo de datos, contratos de API, comportamiento de la interfaz, riesgos y trabajo fuera de alcance.
3. **Revisión del diseño:** cada especificación fue revisada de forma independiente para detectar inconsistencias, problemas de migración o casos borde antes de implementar.
4. **Implementación y verificación:** el código se implementó siguiendo la especificación, se validó con verificación de tipos (TypeScript) y pruebas funcionales de extremo a extremo (smoke tests sobre la API real).

Documentos de diseño generados en esta etapa:
- `2026-05-06-reportes-rediseno-design.md`
- `2026-05-07-averia-camion-design.md`
- `2026-05-09-qr-porteria-design.md`
- `2026-06-13-anden-fuera-servicio-design.md`

---

## 4. Mejoras implementadas

### 4.1 Rediseño de la sección de Reportes y KPIs

**Problema.** La sección de reportes existía pero varios de sus indicadores eran *descriptivos* (conteos, composición) y no apoyaban decisiones operativas. Faltaban indicadores estándar de logística que permitieran evaluar la calidad del servicio.

**Solución.** Se rediseñó el panel para que cada KPI y gráfico tenga un propósito claro y apoye una decisión del jefe de logística. Los cuatro KPIs principales quedaron:

- **Cumplimiento de servicio (%):** porcentaje de unidades efectivamente cargadas respecto a las solicitadas, calculado a nivel de línea de producto. Fórmula: `Σ min(cargada, solicitada) / Σ solicitada`. Mide la capacidad de cumplir lo prometido al cliente.
- **OTIF — On-Time, In-Full (%):** porcentaje de camiones despachados a tiempo **y** completos, sobre los camiones con entrega. Es el estándar logístico de calidad integral del servicio.
- **% de atrasos:** camiones cuya salida real superó la planificada.
- **Tiempo de ciclo promedio:** minutos promedio del camión en planta (llegada real a salida real).

Cada KPI muestra un **delta comparativo respecto al período anterior** del mismo largo, ocultándose cuando la muestra es insuficiente para evitar conclusiones sobre datos ralos.

Se incorporaron además: una **tabla de cumplimiento por tipo de cliente** (Nacional/Exportación/Interplanta) con semáforo de color, una **tabla de productividad de operadores**, y se documentó el propósito de cada widget en una guía dedicada.

**Decisiones de diseño relevantes.**
- *OTIF e In-Full estrictos vs. Cumplimiento continuo:* se distinguió explícitamente entre OTIF (binario por camión: cumplió 100% o no) y Cumplimiento de servicio (porcentaje continuo). Conviven porque miden cosas distintas: uno la severidad del faltante, el otro la proporción de envíos perfectos.
- *Derivación de la cantidad cargada:* como el modelo solo almacena la cantidad solicitada, la cantidad efectivamente cargada se deriva sumando los productos de los pallets de cada entrega.
- *Audiencia:* se priorizó al jefe de logística (decisiones operativas), no a la gerencia.

**Componentes técnicos.** `apps/api/src/reportes/reportes.service.ts` (nuevos cálculos: cumplimiento, OTIF, productividad, comparativo de período); `apps/web/app/(platform)/reportes/page.tsx`; `docs/reportes/guia-kpis.md` (glosario canónico de cada indicador).

**Beneficio.** Provee evidencia cuantitativa y accionable; permite distinguir si un problema está en puntualidad o en completitud, y en qué segmento de cliente se concentra.

---

### 4.2 Manejo de avería de camión

**Problema.** El sistema solo modelaba el camino feliz. Cuando un camión se averiaba, no había forma de registrarlo en vivo ni de mantener la trazabilidad si era reemplazado por otro.

**Solución.** Se implementó un flujo en vivo con dos modalidades, accesible desde el detalle del camión:

- **Esperar reparación in situ:** el camión queda pausado en su estado actual con una marca de "en reparación"; al resolverse, se reactiva y continúa su flujo.
- **Sustitución por otro camión:** se crea un camión nuevo que hereda el pedido, las entregas y las paradas del averiado; el camión original queda en estado terminal `AVERIADO` con un enlace al sustituto, preservando la trazabilidad completa.

Se introdujo un modelo genérico **`IncidenteCamion`** (con enumeraciones `TipoIncidente` y `AccionIncidente`) pensado para reutilizarse en incidentes futuros (falta de producto, cambio de andén, reprogramación).

**Decisiones de diseño relevantes.**
- *Dos registros con enlace (no fusión):* se optó por mantener el camión averiado y el sustituto como entidades distintas enlazadas, que es el estándar logístico para preservar la trazabilidad de auditoría.
- *Regla sanitaria para exportación:* si un camión de exportación ya aprobado por SAG es sustituido, el sustituto **debe volver a pasar inspección SAG** (la aprobación está atada a la patente y sellos físicos, no se hereda).
- *Concurrencia:* la operación usa un bloqueo pesimista a nivel de base de datos para evitar que dos supervisores sustituyan el mismo camión simultáneamente.

**Componentes técnicos.** `schema.prisma` (estado `AVERIADO`, modelo `IncidenteCamion`, campos `enReparacion`/`reemplazadoPorId`); `camiones.service.ts` y `camiones.controller.ts` (transacción de sustitución, endpoints de incidente); interfaz del detalle del camión; widget de "Incidentes operativos" en reportes con la regla de exclusión de camiones averiados del cálculo de KPIs.

**Beneficio.** Cierra el caso de excepción más disruptivo manteniendo la integridad de los datos y sin contaminar los indicadores de cumplimiento.

---

### 4.3 Registro de llegada por QR en portería

**Problema.** El registro de llegada de un camión requería abrir el sistema con una cuenta y operar la interfaz, lo que generaba fricción en portería.

**Solución.** Dos caminos complementarios:

- **Flujo público sin fricción:** cada camión tiene un código QR (firmado con HMAC) en su hoja de ruta. El portero lo escanea con la cámara nativa de su dispositivo, lo que abre una página pública (`/p/{token}`) con los datos del camión y un botón "Confirmar llegada", sin necesidad de iniciar sesión.
- **Pantalla autenticada de respaldo:** un nuevo rol `PORTERO` con una cuenta compartida accede a una pantalla con la lista de camiones del día y un botón de confirmación por camión, para los casos en que el conductor no traiga la hoja.

**Decisiones de diseño relevantes.**
- *Cero fricción aceptando un riesgo controlado:* se priorizó la velocidad sobre el control, confiando en la posesión física del QR; el cambio es inmediatamente visible en el resto del sistema, lo que actúa como control natural.
- *Cuenta compartida de portería:* para la pantalla de respaldo se eligió una cuenta única por dispositivo en lugar de cuentas individuales, reflejando la práctica habitual en planta y minimizando la gestión de usuarios.
- *Reutilización de infraestructura:* se aprovechó el servicio de tokens QR ya existente.

**Componentes técnicos.** Nuevo módulo `apps/api/src/porteria/` (controlador mixto público + autenticado, con bloqueo pesimista para evitar dobles confirmaciones); nueva ruta pública `apps/web/app/p/[token]/`; pantalla autenticada `apps/web/app/(platform)/porteria/`; rol `PORTERO` en el modelo y en el control de acceso.

**Beneficio.** Reduce el tiempo de registro de llegada a segundos y elimina la fricción de autenticación en el punto de entrada.

---

### 4.4 Roles Pickinero vs. Cargador y polivalencia

**Problema.** El sistema definía `PICKINERO` (arma pallets) y `CARGADOR` (carga pallets al camión) como roles separados, pero el control de acceso era laxo (un rol podía ejecutar acciones del otro) y, en la realidad operativa, una misma persona suele cumplir ambas funciones según el turno. Existía una tensión entre la norma de trazabilidad (que exige separar responsabilidades) y la práctica diaria.

**Solución.** Se modeló un atributo **`polivalente`** en el usuario:

- Los roles permanecen conceptualmente separados; cada acción registra por separado quién armó (`pickineroId`) y quién cargó (`cargadorId`) cada pallet, preservando la trazabilidad para auditorías sanitarias.
- Un usuario marcado como polivalente queda habilitado para ejercer ambas funciones (un pickinero polivalente accede también a la pantalla de carga, y viceversa).
- Se reforzó el control de acceso en el backend: solo quien corresponde (o un polivalente) puede ejecutar cada transición del pallet.

**Decisiones de diseño relevantes.**
- *Justificación académica explícita:* la solución concilia la separación de roles exigida por el protocolo de trazabilidad de cadena de frío con la realidad operativa de operarios polivalentes, sin sacrificar la trazabilidad por acción. Este es un punto defendible y argumentable en la presentación.
- *Medición independiente:* los reportes siguen midiendo la productividad de pickineros y cargadores como métricas separadas, aun cuando una misma persona aparezca en ambas.

**Componentes técnicos.** `schema.prisma` (campo `polivalente`); `jwt.strategy.ts` y `auth.service.ts` (propagación del atributo en el token); `pallets.controller.ts` (validación estricta de permisos por acción); barra lateral y layout operativo (visibilidad de pantallas según polivalencia); indicador visual en el encabezado.

**Beneficio.** Resuelve una ambigüedad de larga data del sistema con un modelo que es fiel a la norma y a la operación, y que es directamente argumentable en la defensa.

---

### 4.5 Mejoras de experiencia de usuario (UX)

**Problema.** Para una herramienta evaluable como proyecto de título, la usabilidad y la claridad de la interfaz son criterios relevantes.

**Solución (cambios puntuales de alto impacto).**
- **Barra lateral agrupada por función** (Operación / Análisis / Calidad / Operativo / Configuración) en lugar de una lista plana.
- **Indicador de rol y de polivalencia** en el encabezado.
- **Tooltips de glosario** en cada KPI de reportes, con su definición y rangos de referencia.
- **Estados vacíos mejorados** en las pantallas operativas, con mensajes orientadores.
- **Estilos de impresión** específicos para que los reportes se exporten a PDF de forma limpia (sin menús, con encabezado), facilitando la captura de evidencia para el informe.
- **Redirección por rol tras el login** (cada rol llega directo a su pantalla principal).

**Componentes técnicos.** `components/sidebar.tsx`, `components/header.tsx`, `app/(platform)/reportes/page.tsx`, `app/globals.css`, `app/(auth)/login/page.tsx`, pantallas operativas.

**Beneficio.** Mejora la navegabilidad, la comprensión de términos técnicos por parte de usuarios no especializados y la calidad de los entregables visuales.

---

### 4.6 Manejo de andén fuera de servicio

**Problema.** Cuando un andén fallaba, no había forma de marcarlo en el sistema; podía seguir recibiendo camiones. El único registro era indirecto (justificar el atraso de los afectados).

**Solución.** Se agregó la capacidad de **marcar un andén como fuera de servicio** (con un motivo obligatorio) y **reactivarlo**, desde la pantalla de andenes. Mientras un andén está fuera de servicio, el sistema **impide asignarle camiones**.

**Decisiones de diseño relevantes.**
- *Bloqueo por ocupación:* un andén ocupado no puede marcarse fuera de servicio; primero hay que reasignar el camión (evita estados inconsistentes).
- *Solo estado actual, sin historial:* se acotó el alcance al estado vigente; el historial de fallas por andén quedó como trabajo futuro.
- *Concurrencia sin bloqueo pesimista:* se usó una actualización condicional (`updateMany` con condición de estado) para garantizar la respuesta correcta ante operaciones simultáneas, evitando la complejidad del bloqueo explícito por tratarse de un único campo de baja frecuencia.

**Componentes técnicos.** `schema.prisma` (campos de fuera de servicio en `Anden`); `andenes.service.ts`/`andenes.controller.ts` (endpoints marcar/reactivar, emisión de evento en tiempo real); validación de bloqueo en la asignación de andén; representación visual diferenciada y contador en la pantalla de andenes.

**Beneficio.** Cierra otro caso de excepción operativo, evitando asignaciones erróneas a infraestructura no disponible.

---

### 4.7 Generación de datos sintéticos para resultados

**Problema.** Al no contar con datos reales de operación, se necesitaba un conjunto de datos realista para demostrar el funcionamiento del sistema y evidenciar su aporte en el capítulo de resultados.

**Solución.** Se desarrolló un generador determinista (`apps/api/prisma/generar-datos-demo.ts`) que produce **90 días de operación, con 1.436 camiones**, siguiendo distribuciones realistas:
- Volumen variable por día de la semana (mayor en días laborales, menor sábados, mínimo domingos).
- Mezcla de tipos de camión (60% nacional, 25% exportación, 15% interplanta).
- 8 pickineros y 8 cargadores, para poblar las métricas de productividad.
- Eventos completos por camión (cambios de estado con marcas de tiempo coherentes), entregas, pallets, inspecciones SAG y justificaciones.

El generador implementa una **curva de mejora gradual** (sigmoide) a lo largo del período: la puntualidad, los tiempos de ciclo y el cumplimiento mejoran progresivamente. Adicionalmente incluye **días emblemáticos** con incidentes específicos (avería con sustitución, falla de andén, falta de producto en exportación, día pico de volumen) para ilustrar el manejo de excepciones.

**Justificación metodológica.** La curva de mejora permite que el propio comparativo del sistema (KPI vs. período anterior) evidencie una tendencia positiva, alineada con la hipótesis de que la trazabilidad y el monitoreo contribuyen a mejorar la operación. Es un dato sintético de demostración, no una medición empírica, y debe presentarse como tal en el informe.

**Beneficio.** Provee material cuantitativo y casos cualitativos concretos para la sección de resultados y la defensa.

---

## 5. Resultados cuantitativos (sobre los datos sintéticos)

Comparando los **últimos 30 días contra los 30 días previos** del conjunto generado, el sistema reporta automáticamente:

| Indicador | Período anterior | Últimos 30 días | Variación |
|---|---|---|---|
| OTIF | 29,7 % | 65,5 % | +35,8 puntos |
| Cumplimiento de servicio | ~96,7 % | ~96,3 % | estable (nivel alto) |
| Camiones con atraso | 295 | 64 | −78 % |
| Tiempo de ciclo promedio | 217 min | 200 min | −17 min |

> **Nota para el informe.** Estos valores provienen de datos sintéticos diseñados para ilustrar una operación que mejora con el uso del sistema. No constituyen una medición sobre datos reales de la empresa; su función es demostrar las capacidades analíticas de la herramienta y la coherencia de sus indicadores. La redacción del informe debe enmarcarlos explícitamente como resultados de demostración / prueba de concepto.

Casos cualitativos disponibles en los datos (días emblemáticos): una avería con sustitución de camión, una falla de andén que afecta a varios camiones, una falta de producto en exportación y un día de volumen pico. Todos quedan reflejados en los reportes correspondientes (incidentes operativos, causas de justificación).

---

## 6. Estado del sistema y verificación

- **Verificación de tipos:** ambas aplicaciones (API y web) compilan sin errores (`tsc --noEmit`).
- **Pruebas funcionales:** se realizaron pruebas de extremo a extremo sobre la API real para cada funcionalidad nueva (registro de incidentes, portería por QR y manual, andén fuera de servicio con su bloqueo de asignación, permisos de pallets).
- **Documentación de usuario:** se elaboró un manual por rol, un mapa funcional con matriz de permisos, una guía de KPIs y una guía de prueba manual paso a paso (en `docs/manual/` y `docs/reportes/`).

---

## 7. Trabajo futuro (fuera del alcance de esta etapa)

- Implementar los demás tipos de incidente ya previstos en el modelo (`FALTA_PRODUCTO`, `CAMBIO_ANDEN`, `REPROGRAMACION`) con flujo en vivo.
- Detección automática de camiones atrasados en vivo (job periódico + notificación).
- Historial de fallas por andén (tiempo fuera de servicio acumulado, andenes más problemáticos).
- Reasignación masiva de camiones/paradas cuando un andén cae con trabajo planificado.
- Modelo formal de turnos (hoy la productividad por turno se aproxima por días activos).

---

## 8. Apéndice — Inventario de cambios

**Modelo de datos (`apps/api/src/prisma/schema.prisma`):**
- Estado de camión `AVERIADO`; rol `PORTERO`.
- Enumeraciones `TipoIncidente` y `AccionIncidente`; modelo `IncidenteCamion`.
- Campos en `Camion`: `enReparacion`, `reparacionDesde`, `reemplazadoPorId`.
- Campo `polivalente` en `Usuario`.
- Campos de fuera de servicio en `Anden`: `fueraDeServicio`, `motivoFueraServicio`, `fueraServicioDesde`, `fueraServicioPorId`.

**Backend (NestJS):** módulos `porteria` (nuevo) y `andenes` (extendido); servicios y controladores de `camiones`, `pallets`, `reportes`; estrategia y servicio de autenticación; DTOs de incidente y de fuera de servicio.

**Frontend (Next.js):** páginas de reportes, andenes, detalle de camión, portería (nueva), ruta pública de QR (nueva), picking, carga, login; componentes de barra lateral y encabezado; capa de acceso a la API y tipos compartidos; estilos globales (impresión).

**Generador de datos:** `apps/api/prisma/generar-datos-demo.ts` y actualización de la semilla base.

**Documentación generada:**
- `docs/superpowers/specs/` — 4 documentos de diseño formales.
- `docs/reportes/guia-kpis.md` — glosario de indicadores.
- `docs/manual/` — README, manual por rol, mapa funcional, guía de prueba manual.
- `docs/informe/bitacora-cambios.md` — este documento.

> **Sugerencia de mapeo a capítulos de informe.** Sección 2 → *Marco / Arquitectura*; Sección 3 → *Metodología*; Sección 4 → *Desarrollo / Implementación* (una subsección por funcionalidad); Sección 5 → *Resultados*; Secciones 6–7 → *Conclusiones y trabajo futuro*.
