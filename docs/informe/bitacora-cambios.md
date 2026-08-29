# Bitácora de cambios e implementación — DispatchTrack

> **Propósito de este documento.** Es un registro autocontenido de las mejoras y funcionalidades implementadas en el sistema DispatchTrack durante esta etapa del proyecto de título. Está escrito para servir de **insumo de redacción del informe final de seminario**: cada sección describe el problema, la solución, las decisiones de diseño y su justificación, los componentes técnicos afectados y el beneficio esperado. Puede entregarse a una herramienta de asistencia de redacción (p. ej. Cowork) o usarse directamente como base de los capítulos de desarrollo y resultados.

**Fecha de cierre de la Etapa 1:** 13 de junio de 2026.
**Fecha de cierre de la Etapa 2:** 5 de agosto de 2026 (ver sección 9).
**Magnitud del trabajo (Etapa 1):** 30 archivos modificados o creados, aproximadamente 1.950 líneas de código agregadas. 4 documentos de diseño formales, 5 documentos de manual/guía.
**Magnitud del trabajo (Etapa 2):** 29 archivos modificados o creados, aproximadamente 2.060 líneas de código agregadas; regeneración completa del conjunto de datos sintéticos (180 días).

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

## 7. Trabajo futuro (fuera del alcance de la Etapa 1)

- Implementar los demás tipos de incidente ya previstos en el modelo (`FALTA_PRODUCTO`, `CAMBIO_ANDEN`, `REPROGRAMACION`) con flujo en vivo.
- Detección automática de camiones atrasados en vivo (job periódico + notificación).
- ~~Historial de fallas por andén (tiempo fuera de servicio acumulado, andenes más problemáticos).~~ **Completado en la Etapa 2, ver sección 9.3.**
- Reasignación masiva de camiones/paradas cuando un andén cae con trabajo planificado.
- Modelo formal de turnos (hoy la productividad por turno se aproxima por días activos).

---

## 8. Apéndice — Inventario de cambios (Etapa 1)

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

---

## 9. Etapa 2 — Ajustes previos a la defensa de avance (5 de agosto de 2026)

Esta etapa se realizó en preparación de la **defensa de avance del proyecto de título**. Su eje fue reemplazar los datos de demostración por un **conjunto de datos sintéticos calibrado con el contexto real de negocio** que el estudiante recopiló directamente del caso de estudio, y cerrar dos brechas de trazabilidad detectadas al construirlo: el historial de fallas de infraestructura y la ausencia de un módulo de túneles de frío como recurso gestionable.

### 9.1 Consolidación de trabajo pendiente y ajuste de despliegue

**Contexto.** Al iniciar esta etapa había un conjunto grande de cambios sin commitear (rediseño de reportes, portería, avería, andén fuera de servicio, generador de 90 días, documentación) acumulados bajo una restricción previa de "no hacer commits". El usuario levantó esa restricción para reflejar el trabajo en producción antes de la defensa.

**Solución.** Se hizo commit y push de todo el trabajo acumulado. Se detectó que el comando de arranque en producción (`railway.toml` / `Dockerfile.api`) usaba `prisma migrate deploy`, que requiere una carpeta `prisma/migrations/` que el proyecto no tenía — es decir, **los cambios de esquema nunca se aplicaban en producción** al desplegar. Se cambió a `prisma db push --accept-data-loss`, que sincroniza el esquema directamente sin depender de archivos de migración versionados, apropiado para la etapa actual del proyecto (aún sin necesidad de migraciones auditables incrementales).

**Componentes técnicos.** `railway.toml`, `Dockerfile.api`.

**Beneficio.** Garantiza que cada despliegue a Railway efectivamente sincroniza el esquema de base de datos con el código, evitando una clase de bug silencioso (API funcionando contra un esquema desactualizado).

### 9.2 Ajuste visual del reporte de tiempo por punto de expedición

**Problema.** El gráfico de tiempo promedio por punto de expedición (Aves/Cerdo/Frigorífico) usaba barras verticales agrupadas, dificultando comparar los tres puntos de un vistazo.

**Solución.** Se cambió a barras horizontales apiladas (una fila por punto de expedición), cada una con su barra de presupuesto de tiempo (semitransparente) superpuesta a la barra de tiempo real, facilitando la comparación visual entre los tres puntos y su cumplimiento respecto al presupuesto.

**Componentes técnicos.** `apps/web/app/(platform)/reportes/page.tsx` (componente `GraficoTiempoEdificio`, migrado de `BarChart` vertical a `layout="vertical"` de Recharts).

### 9.3 Datos sintéticos calibrados con contexto de negocio real (180 días) e historial de fallas de infraestructura

**Problema.** El generador de la Etapa 1 (90 días) usaba supuestos genéricos de volumen y distribución de camiones. Para la defensa de avance, el estudiante recopiló contexto operativo real de un caso de estudio agroindustrial (bajo condición explícita de no identificar a la empresa por nombre) que el conjunto de datos debía reflejar fielmente. Adicionalmente, se detectó que **el propio sistema no conservaba historial de fallas de andén**: al reactivar un andén, los campos de motivo y fecha se sobrescribían a `null`, perdiendo el registro — una limitación real del producto, no solo del generador de datos.

**Contexto de negocio incorporado** (recopilado directamente del usuario en esta sesión):
- **Calendario semanal:** operación de lunes a sábado; el domingo la planta cierra por completo desde las 06:00 y reabre a las 22:30 para empezar a recibir camiones hasta el sábado siguiente.
- **Volumen diario:** el martes es el día de mayor recepción (~100 camiones); miércoles y jueves también altos; el resto de los días ronda los 40-70; promedio semanal 70-80 camiones/día en días operativos.
- **Puntos de expedición:** Aves exporta en fresco (sin congelar); Cerdo **nunca** exporta (solo despacho nacional/interplanta); Frigorífico exporta congelado (aves, cerdo y salmón congelados) y es el único punto con productos congelados. Los camiones de exportación predominan sobre nacional/interplanta en todo momento dentro de la planta.
- **Tiempos operativos:** portería ≤10 minutos; carga hasta 1h20-1h30 por punto de expedición; túnel de frío hasta presentación a inspección SAG, 8-8,5 horas. Límite legal de referencia: 3 horas para camiones nacional/interplanta, 6 horas para exportación — el estudiante indicó explícitamente que en la práctica este límite se excede con frecuencia (incluso por días completos en casos extremos), lo que se modeló como un 5-10% de camiones con atrasos fuertes fuera de norma.
- **Inspección SAG:** tasa de rechazo de 60-70% (confirmada explícitamente por el usuario pese a ser un valor alto para un proceso de inspección real).
- **Andenes fuera de servicio:** 1-2 fallas por semana en total (cualquier punto de expedición), con tiempo de reparación muy variable (30 minutos a un día completo); Frigorífico prácticamente nunca falla por la criticidad de temperatura de sus productos (se modeló como un outlier de baja probabilidad, no imposible).

**Solución técnica.**
- Se reescribió `generar-datos-demo.ts` para generar **180 días** de operación (~12.300 camiones) siguiendo exactamente los parámetros anteriores, generando todo el conjunto en memoria y utilizando inserciones masivas por lotes (`createMany`) en vez de escrituras individuales, para que el volumen fuera viable de generar en un tiempo razonable.
- Se agregó el modelo **`HistorialAndenFueraServicio`**: un registro inmutable y permanente de cada período en que un andén estuvo fuera de servicio (motivo, fecha de inicio, fecha de fin, quién lo marcó, quién lo reactivó), independiente del estado "en vivo" del andén (que sigue existiendo para la UI operativa). `andenes.service.ts` se modificó para crear un registro de historial al marcar la falla y cerrarlo (no borrarlo) al reactivar.
- Se conectó el modelo **`AuditLog`**, que existía en el esquema desde etapas anteriores pero **nunca se usaba en ningún servicio**: ahora registra el inicio de sesión (`auth.service.ts`) y la creación/actualización/desactivación de usuarios (`usuarios.service.ts`), dejando trazabilidad de acciones administrativas que antes no quedaban registradas en ningún lado.
- Se agregó una métrica nueva en reportes: fallas por andén y tiempo promedio de resolución (`calcularFallasAnden` en `reportes.service.ts`).

**Incidente de infraestructura y su resolución.** Durante la primera ejecución del generador de 180 días contra la base de datos de producción (Railway, plan gratuito), la instancia de PostgreSQL **agotó por completo el volumen de disco asignado (500 MB)** al insertar la tabla de productos por pallet (la más numerosa del conjunto), provocando una caída del servicio ("PANIC: could not write to file... No space left on device"). Se diagnosticó la causa (el volumen de datos generado excedía el disco disponible del plan gratuito), se guio al usuario para ampliar el volumen mediante la función de *live resize* de Railway (de 500 MB a varios GB, con cobro solo por el espacio efectivamente usado) y se recuperó el servicio. Dado que gran parte de los datos ya insertados eran válidos, se optó por **scripts de recuperación puntual** (`completar-productos-pallet.ts`, `completar-historial-fallas.ts`) que completaron únicamente los registros faltantes en lotes pequeños, en lugar de regenerar el conjunto completo desde cero. El tamaño final de la base de datos quedó en ~173 MB, muy por debajo del nuevo límite del volumen.

**Decisiones de diseño relevantes.**
- *Generación en memoria + inserción masiva:* la escala del dataset (180 días, ~12.300 camiones, ~190.000 pallets, ~476.000 productos por pallet) hace impracticable una escritura fila por fila contra una base remota; se optó por construir todas las estructuras en JavaScript con IDs propios y luego insertarlas en lotes (`createMany`), reduciendo drásticamente los viajes de red.
- *Historial como tabla aparte, no como campo:* se separó el "estado actual" (campos en `Anden`, usados por la UI operativa) del "historial permanente" (tabla `HistorialAndenFueraServicio`), evitando romper el comportamiento existente mientras se añade la capacidad de reportar frecuencia y tiempos de resolución.
- *Transparencia metodológica sobre el rechazo SAG:* se mantuvo la tasa de 60-70% de rechazo tal como la indicó el usuario, aun siendo alta para un proceso real, documentándose explícitamente como un parámetro de contexto de negocio dado, no una estimación del estudiante.

**Componentes técnicos.** `schema.prisma` (`HistorialAndenFueraServicio`); `andenes.service.ts`, `andenes.controller.ts`; `auth.service.ts`, `auth.controller.ts`, `usuarios.service.ts`, `usuarios.controller.ts` (conexión de `AuditLog`); `reportes.service.ts` (métrica de fallas por andén); `apps/api/prisma/generar-datos-demo.ts` (reescritura completa); `apps/api/prisma/completar-productos-pallet.ts` y `completar-historial-fallas.ts` (scripts de recuperación).

**Beneficio.** El conjunto de datos de demostración queda alineado con la realidad operativa descrita por el caso de estudio, aportando credibilidad a los resultados mostrados en la defensa. De forma colateral, se corrigió una limitación real del producto (pérdida de historial de fallas de andén) y se activó un mecanismo de auditoría que estaba definido pero inerte desde etapas anteriores.

### 9.4 Módulo de túneles de frío

**Problema.** El sistema modelaba el paso por el túnel de frío únicamente como un estado del camión (`EN_TUNEL_FRIO`), sin ningún recurso físico asociado — a diferencia de los andenes, no existía forma de saber **qué camión está usando cuál túnel**, ni quién lo hizo ingresar o salir. Adicionalmente, se detectaron dos fallas activas en el flujo existente: la pantalla operativa de túnel invocaba un endpoint del backend que **no existía** (`/camiones/:id/tunel`), y el modelo `EventoTunel` (pensado para registrar la temperatura validada) estaba definido en el esquema pero **nunca se escribía** desde ningún servicio.

**Solución.** Se modeló el túnel de frío como un recurso real, en espejo directo del diseño de `Anden`:

- Nuevo modelo **`TunelFrio`** (código, ocupación, fuera de servicio) exclusivo del edificio Frigorífico, con 5 túneles físicos (`TF1`-`TF5`).
- Nuevo modelo **`HistorialTunelFueraServicio`**, con el mismo patrón que el de andenes (registro permanente, independiente del estado en vivo).
- Campo `tunelId` en `Camion`, para saber en todo momento qué túnel usa cada camión.
- Flujo operativo de tres pasos, reemplazando el paso único y roto anterior: **(1)** finalizar carga (`EN_CARGA → EN_TUNEL_FRIO`), **(2)** ingresar explícitamente a uno de los túneles disponibles (el operador elige cuál, quedando registrado quién y cuándo), **(3)** registrar la temperatura de salida (corrige el endpoint inexistente; ahora sí persiste un `EventoTunel` con operador, temperatura y observaciones, y libera el túnel automáticamente).
- Nueva pantalla `/tuneles` (análoga a `/andenes`) para visualizar el estado de los 5 túneles y gestionar fuera de servicio/reactivación.

**Decisiones de diseño relevantes.**
- *Espejar el diseño de `Anden` en vez de crear un patrón nuevo:* al ser un recurso físico con las mismas necesidades (ocupación, fuera de servicio con historial, asignación a un camión), replicar el modelo ya validado reduce el riesgo de diseño y mantiene el código consistente.
- *Paso de ingreso explícito, no automático:* se optó por que el operador elija manualmente el túnel (en vez de asignación automática al primero disponible) porque el requisito explícito del usuario fue poder ver "quién entra y quién saca" cada camión — una asignación automática habría ocultado esa decisión operativa.
- *Corrección de bugs preexistentes como parte del alcance:* al construir la funcionalidad pedida se encontraron dos fallas reales del sistema (endpoint inexistente, modelo de auditoría de temperatura inerte); se corrigieron en el mismo cambio por estar directamente en el camino crítico de la funcionalidad solicitada.

**Componentes técnicos.** `schema.prisma` (`TunelFrio`, `HistorialTunelFueraServicio`, campo `tunelId` en `Camion`); nuevo módulo `apps/api/src/tuneles/` (servicio, controlador, DTOs); `camiones.service.ts`/`camiones.controller.ts` (liberación de túnel al salir de `EN_TUNEL_FRIO`, nuevo DTO y método para registrar temperatura); `eventos.gateway.ts` (evento en tiempo real `tuneles:actualizados`); `apps/web/app/(platform)/tuneles/` (nueva pantalla); `apps/web/app/(operativo)/tunel/page.tsx` (rediseño en tres secciones); hooks y capa de acceso a la API correspondientes; actualización de la semilla base (5 túneles).

**Beneficio.** Cierra una brecha de trazabilidad simétrica a la de andenes para el único recurso físico de la planta que antes no era gestionable, y corrige dos fallas reales que impedían que el flujo de túnel funcionara como estaba pensado.

### 9.5 Modelo predictivo: árboles de decisión para riesgo OTIF y riesgo SAG

Por solicitud explícita del profesor guía, se implementó un **modelo predictivo basado en árbol de decisión (CART)** sobre el conjunto de datos sintéticos de 180 días, con dos variables objetivo: riesgo de incumplimiento OTIF y riesgo de rechazo en inspección SAG. El modelo se entrenó con **Python/scikit-learn** y quedó **integrado en vivo** en la aplicación (arquitectura descrita en el punto 7 del documento de diseño, opción B: entrenamiento con Python, evaluación del árbol ya entrenado dentro del backend NestJS, sin infraestructura nueva).

**Hallazgo adicional durante la preparación de los datos de entrenamiento.** Al extraer los datos para entrenar, se detectó que el corte de disco de Railway (sección 9.3) había ocurrido *antes* de que el generador alcanzara a insertar `EventoCamion`, `InspeccionSAG`, `IncidenteCamion` y `JustificacionAtraso` — estas cuatro tablas estaban prácticamente vacías para los 180 días (solo 39 eventos y 1 inspección SAG en total, cuando debían ser decenas de miles). Se reconstruyeron con un script de recuperación adicional (`completar-eventos-sag-incidentes.ts`) que replica la misma lógica probabilística del generador original a partir de los datos ya persistidos (horarios reales, estado final del camión), insertando finalmente 96.345 eventos, 10.278 inspecciones SAG, 2.117 incidentes y 3.132 justificaciones de atraso. Sin esta corrección, además de imposibilitar el entrenamiento del modelo SAG, los reportes de tiempo de túnel e incidentes operativos habrían aparecido vacíos para todo el período histórico.

**Metodología y resultados** (dataset de prueba, 20% de los datos, no usado en entrenamiento):

| Modelo | Ejemplos | Accuracy | Precision | Recall | F1-score |
|---|---|---|---|---|---|
| Riesgo OTIF (todos los tipos) | 12.323 | 70,6 % | 33,6 % | 96,0 % | 49,7 % |
| Riesgo SAG (solo exportación) | 6.027 | 56,5 % | 69,7 % | 58,1 % | 63,4 % |

Ambos árboles se entrenaron con `class_weight="balanced"` (compensa el desbalance de clases: solo 15% de los camiones cumplen OTIF), profundidad máxima 4 (interpretabilidad) e impureza Gini.

- **Riesgo OTIF:** la variable `cantidadPalletsSolicitados` concentra el 98,9% de la importancia del modelo. Esto es coherente y explicable: el volumen de pallets solicitados es, por diseño del dataset, un proxy casi perfecto del tipo de camión (exportación pide sistemáticamente más pallets que nacional/interplanta), y el tipo de camión determina el riesgo estructural de incumplimiento (los camiones de exportación dependen de superar la inspección SAG para poder despacharse a tiempo).
- **Riesgo SAG:** mostró más poder predictivo del esperado (accuracy 56,5%, mejor que el azar) pese a que el rechazo se modeló como un evento aproximadamente aleatorio en el generador. Se documenta como limitación metodológica que parte de esta señal podría deberse a una autocorrelación débil del generador de números pseudoaleatorios simple (congruencial lineal) usado tanto en el generador de datos original como en el script de recuperación, más que a una relación causal real — un punto a discutir honestamente si se pregunta en la defensa.

**Componentes técnicos.**
- `apps/api/ml/entrenar_modelos.py` (extracción de datos, entrenamiento, métricas, exportación de reglas a JSON, visualización del árbol) y `apps/api/ml/requirements.txt`.
- `apps/api/prisma/completar-eventos-sag-incidentes.ts` (script de recuperación de las cuatro tablas afectadas por el corte de disco).
- Nuevo módulo `apps/api/src/prediccion/` (NestJS): `arbol-decision.ts` (evaluador del árbol exportado + featurización idéntica a la de entrenamiento), `prediccion.service.ts` (carga los JSON al iniciar la API, calcula predicciones por camión), `prediccion.controller.ts` (endpoints `GET /prediccion/:camionId` y `GET /prediccion/modelos`).
- `apps/api/src/prediccion/modelos/arbol-otif.json` y `arbol-sag.json` — árboles entrenados, exportados como reglas (umbral por nodo), sin ninguna dependencia de Python en producción.
- `nest-cli.json` — se agregó configuración de `assets` para que el build copie los JSON de los modelos al `dist/`.
- Frontend: tarjeta "Predicción de riesgo" en la ficha del camión (`apps/web/app/(platform)/camiones/[id]/page.tsx`), que muestra el riesgo OTIF (todos los camiones) y el riesgo SAG (solo exportación) con su nivel de confianza.
- Visualizaciones y reporte de métricas para el informe en `docs/informe/modelo-prediccion/` (`arbol-otif.png`, `arbol-sag.png`, `reporte-metricas.md`).

**Decisión de arquitectura.** Se optó explícitamente por *no* desplegar un microservicio Python en Railway (opción A del diseño), dado el incidente de disco de esta misma etapa: minimizar infraestructura nueva antes de la defensa. El entrenamiento y la evaluación de métricas ocurren en Python (cumpliendo el requisito del profesor guía), pero la inferencia en producción es una función pura de TypeScript que camina la estructura del árbol ya entrenado — sin llamadas de red adicionales ni procesos externos.

**Beneficio.** Aporta un componente de aprendizaje automático supervisado, interpretable y defendible académicamente (árbol de decisión con métricas estándar, matriz de confusión e importancia de variables), integrado en la operación real del sistema sin comprometer la estabilidad de la infraestructura de despliegue.

**Corrección posterior — conteo de "confianza" por predicción.** Al revisar cuántos casos históricos respaldan cada predicción individual, se detectó un error en la exportación del árbol: la cantidad de muestras por hoja se calculaba sumando el arreglo de valores *ponderados* por `class_weight="balanced"` (usado para compensar el desbalance de clases), en vez de la cantidad real de camiones históricos (`n_node_samples`, no ponderada). Esto hacía que el campo "confianza" mostrado en la interfaz reportara números artificialmente bajos —en algún caso llegando a 0— sin reflejar el respaldo estadístico real de la predicción. Se corrigió para usar siempre el conteo real. Con la corrección, la distribución real de respaldo por hoja quedó así:

| Modelo | N° de hojas | Mínimo de casos por hoja | Mediana | Máximo |
|---|---|---|---|---|
| Riesgo OTIF | 9 | 156 | 600 | 4.843 |
| Riesgo SAG | 15 | 26 | 120 | 1.720 |

El modelo OTIF queda bien respaldado (mínimo 156 casos por predicción). El modelo SAG tiene algunas hojas cercanas al mínimo configurado (`min_samples_leaf=25`), especialmente las que separan por combinaciones finas de día/hora — predicciones puntuales de esas ramas son estadísticamente más frágiles que el resto. Se documenta como una limitación honesta a mencionar si se pregunta en la defensa, no oculta.

---

## 10. Apéndice — Inventario de cambios (Etapa 2)

**Modelo de datos (`apps/api/src/prisma/schema.prisma`):**
- Modelo `HistorialAndenFueraServicio` (historial permanente de fallas de andén).
- Modelo `TunelFrio` (recurso físico, 5 túneles, exclusivo de Frigorífico).
- Modelo `HistorialTunelFueraServicio` (historial permanente de fallas de túnel).
- Campo `tunelId` en `Camion`.

**Backend (NestJS):** nuevo módulo `tuneles/` completo (servicio, controlador, DTOs `ingresar-tunel` y `marcar-fuera-servicio`); nuevo DTO `registrar-temperatura` en `camiones/`; cambios en `andenes.service.ts`, `andenes.controller.ts`, `auth.service.ts`, `auth.controller.ts`, `usuarios.service.ts`, `usuarios.controller.ts`, `reportes.service.ts`, `eventos.gateway.ts`, `camiones.service.ts`, `camiones.controller.ts`, `app.module.ts`, `main.ts`.

**Frontend (Next.js):** nueva pantalla `apps/web/app/(platform)/tuneles/`; rediseño de `apps/web/app/(operativo)/tunel/page.tsx`; hook `use-tuneles.ts`; extensión de `use-socket.ts`, `lib/api.ts`, `components/sidebar.tsx`; ajuste del gráfico en `app/(platform)/reportes/page.tsx`.

**Datos y despliegue:** reescritura completa de `generar-datos-demo.ts` (180 días, contexto de negocio real); scripts de recuperación `completar-productos-pallet.ts` y `completar-historial-fallas.ts`; actualización de `seed.ts` (5 túneles); cambio de `prisma migrate deploy` a `prisma db push` en `railway.toml` y `Dockerfile.api`.

**Documentación:** esta sección (9) y este apéndice (10), agregados a `docs/informe/bitacora-cambios.md`.

> **Sugerencia de mapeo a capítulos de informe.** Sección 9.1 → *Infraestructura de despliegue*; 9.2 → *Mejora de interfaz analítica*; 9.3 → *Metodología de generación de datos y su justificación con el caso de estudio* (fuente primaria para el capítulo de "Datos y Método"); 9.4 → *Desarrollo / Implementación* (funcionalidad nueva); 9.5 → *Trabajo en curso / Modelo predictivo* (capítulo de resultados avanzados, una vez finalizado).
