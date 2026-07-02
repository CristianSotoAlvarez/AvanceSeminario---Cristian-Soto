# Guía de KPIs — Reportes

Documento que explica **qué mide**, **por qué importa**, **qué decisión apoya** y **cómo se calcula** cada widget de la página `/reportes`. Audiencia: jefe de logística, supervisores, equipo de mejora continua y futuros desarrolladores que mantengan el módulo.

> Las fórmulas, fuentes y umbrales siguen lo definido en `docs/superpowers/specs/2026-05-06-reportes-rediseno-design.md`. Cualquier cambio debe reflejarse en ambos lados.

---

## 1. KPIs principales

### 1.1 Cumplimiento de servicio

- **Qué mide**: porcentaje de unidades efectivamente cargadas vs unidades solicitadas, agregado a nivel línea de producto en el rango de fechas.
- **Fórmula**: `Σ min(cantidadCargada, cantidadSolicitada) / Σ cantidadSolicitada`, donde `cantidadCargada` se deriva sumando `ProductoPallet.cantidad` de los pallets de la entrega que matchean el `productoId` del `EntregaItem`.
- **Por qué importa**: refleja la capacidad de la planta de **cumplir lo prometido al cliente**. Si baja, hubo faltantes (productos no disponibles, pallets incompletos, errores de picking) que afectan la relación comercial.
- **Decisión que apoya**:
  - Si baja sostenidamente → revisar disponibilidad de SKUs y procesos de picking.
  - Diferenciar por tipo de cliente (ver tabla "Cumplimiento por tipo") para ver si el problema está concentrado.
- **Interpretación**: ≥95% saludable, 90-95% atención, <90% acción inmediata.
- **Fuentes**: `entrega_items.cantidadSolicitada`, `pallets`, `productos_pallet.cantidad`.

### 1.2 OTIF (On-Time, In-Full)

- **Qué mide**: porcentaje de camiones que salieron **a tiempo Y completos** sobre los camiones planificados con al menos una entrega.
- **Fórmula**: `camiones (onTime AND inFull) / camiones con entregas en el rango`.
  - `onTime` = `horaSalidaReal ≤ horaSalidaPlanificada` (sin margen).
  - `inFull` = todas las líneas del camión cumplidas al 100% (`cantidadCargada ≥ cantidadSolicitada` para todo `EntregaItem`).
- **Por qué importa**: es el estándar logístico que mide la **calidad integral del servicio**. Es estricto: un retraso o un faltante en una línea hace que el camión NO cuente como OTIF.
- **Decisión que apoya**:
  - Comparar contra acuerdos contractuales con clientes.
  - Identificar si la falla está en puntualidad o completitud (mirando las componentes en la tabla por tipo).
- **Interpretación**: ≥90% bueno (estándar industrial), 80-90% mejora, <80% crítico.
- **Fuentes**: `camiones.horaSalidaReal/Planificada`, `entrega_items`, `pallets`, `productos_pallet`.

### 1.3 % atrasos

- **Qué mide**: cantidad y % de camiones despachados que salieron después de la hora planificada.
- **Fórmula**: `count(camiones DESPACHADO con horaSalidaReal > horaSalidaPlanificada) / count(camiones DESPACHADO)`.
- **Por qué importa**: foco operativo del día. Atrasos tensionan la cadena de despachos siguientes.
- **Decisión que apoya**: dónde reforzar dotación o rediseñar planificación de llegadas si el % sube.
- **Interpretación**: <10% saludable, 10-20% atención, >20% acción.
- **Fuentes**: `camiones`.

### 1.4 Tiempo de ciclo promedio

- **Qué mide**: minutos promedio que un camión despachado pasa en planta (desde llegada real hasta salida real).
- **Fórmula**: `AVG(horaSalidaReal - horaLlegadaReal)` en camiones despachados del rango.
- **Por qué importa**: indicador directo de **productividad de planta**. Si sube sin que aumente el volumen, hay cuello de botella.
- **Decisión que apoya**: ¿el problema es de planta o de programación de llegadas?
- **Interpretación**: depende del tipo (nacional ~3h, exportación ~6h). El delta vs período anterior es más informativo que el valor absoluto.
- **Fuentes**: `camiones.horaLlegadaReal`, `camiones.horaSalidaReal`.

> **Nota sobre deltas**: las cards muestran un "vs período anterior". Cuando la muestra es insuficiente (< 3 días de rango o < 5 camiones), el delta se oculta y aparece el aviso *"Muestra insuficiente para tendencia"*.

> **Regla de exclusión por incidentes** (introducida con el flujo de avería de camión): los camiones con `estado = AVERIADO` se **excluyen** del universo de cálculo de Cumplimiento de servicio, OTIF, % atrasos, Tiempo de ciclo, Cumplimiento por tipo, `totalCamiones`, `despachadosPorDia`, `porEstado` y `camionesTorta`. Cuando un camión X se sustituye por avería, su carga (entregas/paradas) se traspasa al sustituto Y, así que el cálculo cuenta una sola vez (a través de Y). Los incidentes propiamente tales aparecen en su widget dedicado, no inflan los KPIs operativos.

---

## 2. Tablas

### 2.1 Cumplimiento por tipo de cliente

- **Qué mide**: para cada `TipoCamion` (NACIONAL/EXPORTACION/INTERPLANTA), cuántos camiones, % On-Time, % Cumplimiento de servicio y % OTIF.
- **Por qué importa**: reemplaza al donut de composición por algo **diagnóstico**. Permite ver si una caída global de OTIF está concentrada en un segmento (típicamente exportación, que es más sensible a multas y tiempos de inspección SAG).
- **Decisión que apoya**:
  - **OTIF bajo en EXPORTACION** → revisar coordinación SAG / túnel de frío.
  - **Cumplimiento bajo en NACIONAL** → revisar inventario y picking.
  - **On-Time bajo y cumplimiento alto** → problema de programación, no de productos.
- **Interpretación**: semáforo en celdas — rojo <80%, ámbar 80-90%, verde ≥90%.
- **Fuentes**: las mismas que OTIF y Cumplimiento de servicio, agrupadas por `Camion.tipo`.

### 2.2 Productividad de operadores

- **Qué mide**: rendimiento individual de pickineros y cargadores en el rango. Toggle entre roles porque las métricas no son comparables entre sí.
- **Pickineros**: pallets armados, tiempo promedio de armado (filtrado IQR para excluir outliers como pallets mal cerrados), días activos, pallets/turno.
- **Cargadores**: pallets cargados, camiones distintos atendidos, días activos, pallets/turno.
- **Definición de turno**: `pallets / días distintos con actividad del operador`. No requiere modelo de turnos formal; aproxima jornadas reales.
- **Por qué importa**: identificar capacitación, reconocer top performers, balancear carga, detectar outliers de captura de datos.
- **Decisión que apoya**:
  - Asignar top performers a turnos críticos (exportación).
  - Capacitar a quienes tienen tiempos promedio muy altos.
  - Investigar tiempos sospechosamente bajos (¿se saltan pasos?, ¿bug de captura?).
  - Equilibrar la dotación si hay diferencias de 2x o más entre operadores.
- **Interpretación**: la **mediana del equipo** es la referencia. Operadores fuera de ±50% de la mediana merecen atención.
- **Fuentes**: `pallets.pickineroId`, `pallets.cargadorId`, `pallets.tiempoArmadoSegundos`, `pallets.timestampInicio/Fin`, `entregas.camionId`.

### 2.3 Mediana de presupuesto por edificio

- **Qué mide**: tiempo mediano (con filtro IQR) de paradas completadas en cada edificio en los últimos 30 días, distribuido como presupuesto sobre los topes nacional (3h) y exportación (6h).
- **Por qué importa**: permite asignar **un presupuesto de tiempo realista** a cada punto de expedición (Aves, Cerdo, Frigorífico) basado en datos históricos, no en supuestos.
- **Decisión que apoya**: definir SLA internos por punto y compararlos con el real (ver "Tiempo por edificio").
- **Interpretación**: si la mediana de un edificio crece mes a mes → degradación operacional ahí.
- **Fuentes**: `paradas_expedicion.horaInicio/Fin`, `justificaciones_atraso` (las marcadas como `excluirDelCalculo` se descartan).

---

## 3. Gráficos

### 3.1 Despachos por día

- **Qué mide**: cantidad de camiones despachados cada día en los últimos 30 días.
- **Por qué importa**: identifica **patrones diarios** (días pico, días con caída) y ayuda a planificar dotación por día de la semana.
- **Decisión que apoya**: programación semanal de personal y andenes.
- **Interpretación**: una caída brusca aislada suele ser falla operativa; una tendencia de varios días requiere análisis.
- **Fuentes**: `camiones.horaSalidaReal`.

### 3.2 Distribución por estado

- **Qué mide**: cuántos camiones hay en cada estado del flujo en el rango (ESPERADO, EN_PORTERIA, ASIGNADO, EN_CARGA, EN_TUNEL_FRIO, ESPERANDO_SAG, APROBADO_SAG, RECHAZADO_SAG, LISTO, DESPACHADO).
- **Por qué importa**: **foto del estado del flujo**, útil para detectar cuellos: si hay muchos camiones acumulados en un estado, ese paso es el cuello de botella.
- **Decisión que apoya**: dónde intervenir hoy (asignar más personal a un edificio, llamar a SAG, etc.).
- **Interpretación**: en condiciones normales la mayoría debería estar en DESPACHADO o LISTO al final del día. Una alta proporción en ESPERANDO_SAG o EN_PORTERIA sugiere bloqueos.
- **Fuentes**: `camiones.estado`.

### 3.3 Tiempo por edificio vs presupuesto

- **Qué mide**: tiempo promedio real de paradas completadas en cada edificio, comparado con el presupuesto (mediana histórica). Las paradas con justificación `excluirDelCalculo` se excluyen.
- **Por qué importa**: visualiza qué edificio está sobre presupuesto y por cuánto. Es el principal indicador de **eficiencia operativa por punto de expedición**.
- **Decisión que apoya**: dónde aplicar mejora de procesos, capacitación o redistribución de andenes.
- **Interpretación**: barras rojas indican promedio sobre presupuesto. Cualquier edificio +20% sobre presupuesto requiere revisión.
- **Fuentes**: `paradas_expedicion`, `justificaciones_atraso`.

### 3.4 Inspecciones SAG (con tiempo en túnel)

- **Qué mide**: total de inspecciones SAG, aprobados, rechazados, tasa de aprobación y tiempo promedio en túnel de frío (calculado desde transiciones de estado en `EventoCamion`, NO desde `EventoTunel` que solo guarda lecturas de temperatura).
- **Por qué importa**: SAG es **bloqueante para exportación**. Una baja tasa de aprobación o un tiempo de túnel creciente impactan directamente en compromisos comerciales internacionales.
- **Decisión que apoya**:
  - Tasa de aprobación <80% → revisar cumplimiento de protocolos antes de SAG.
  - Tiempo de túnel creciente → revisar coordinación operativa o capacidad del túnel.
- **Interpretación**: tasa de aprobación >80% saludable; tiempo de túnel debe mantenerse acotado a la temperatura objetivo definida.
- **Fuentes**: `inspecciones_sag`, `eventos_camion` (estados `EN_TUNEL_FRIO`).

### 3.5 Incidentes operativos

- **Qué mide**: cantidad de incidentes registrados en el rango, agrupados por tipo de incidente y acción tomada. En esta versión solo aparecen averías:
  - **Avería · reparación in situ** — el camión esperó reparación y siguió su flujo.
  - **Avería · sustitución de camión** — se traspasaron las entregas a otro camión.
- **Por qué importa**: los incidentes son interrupciones del flujo normal. Si crecen, hay un problema sistémico (mantención de flota, coordinación con proveedores, etc.).
- **Decisión que apoya**:
  - "Sustituciones" en alza → revisar mantenimiento de flota, exigir flota más nueva al transportista.
  - "Reparaciones in situ" en alza → analizar tiempo medio de reparación y si bloquea andenes críticos.
- **Interpretación**: cuenta **eventos**, no camiones. Si un camión Y reemplaza a X y luego Z reemplaza a Y, son 2 incidentes distintos (es lo que se quiere medir, cada avería operacional).
- **Fuentes**: tabla `incidentes_camion` filtrada por `timestamp` en el rango.

> Los próximos tipos de incidente (`FALTA_PRODUCTO`, `CAMBIO_ANDEN`, `REPROGRAMACION`) reutilizan el mismo modelo y se sumarán a este widget cuando se implementen.

### 3.6 Top causas de justificación

- **Qué mide**: ranking de causas registradas por los supervisores cuando un atraso se justifica (FALLA_ANDEN, FALLA_MECANICA, FALTA_PERSONAL, FALTA_PRODUCTO, VOLUMEN_EXCESIVO, PROBLEMA_CALIDAD, OTRO).
- **Por qué importa**: input directo para **mejora continua**. Si las causas se concentran en una o dos categorías, ahí está la mayor oportunidad de impacto.
- **Decisión que apoya**: priorizar proyectos de mejora (ej: si "FALTA_PERSONAL" lidera → revisar dotación; si "FALLA_ANDEN" → mantenimiento).
- **Interpretación**: la concentración importa. 80% de las causas en 2 categorías = oportunidad clara. Distribución plana = problemas dispersos.
- **Fuentes**: `justificaciones_atraso.causa`.

---

## 4. Apéndice — Definiciones y términos

- **Camión planificado**: registro `Camion` con `horaLlegadaPlanificada` dentro del rango consultado.
- **Camión despachado**: con `estado = DESPACHADO` (resultado conocido).
- **On-Time**: `horaSalidaReal ≤ horaSalidaPlanificada`. No hay tolerancia de minutos.
- **In-Full**: por camión, todas las líneas (`EntregaItem`) tienen `cantidadCargada ≥ cantidadSolicitada`. Camiones sin entregas no se evalúan.
- **cantidadCargada** (derivada): `SUM(ProductoPallet.cantidad)` de los pallets de la entrega cuyo `productoId` matchea el del `EntregaItem`. `ProductoPallet` con `productoId NULL` se ignora.
- **IQR**: filtro estadístico (rango intercuartil x 1.5) usado para excluir outliers en cálculos de medianas y promedios de tiempos.
- **Justificación excluida**: parada con `JustificacionAtraso.excluirDelCalculo = true`. Se excluye del cálculo de tiempos por edificio para no distorsionar promedios con incidentes externos justificados.
- **Tiempo en túnel**: `LEAD(timestamp) - timestamp` en `EventoCamion` cuando el evento actual es `EN_TUNEL_FRIO`, promediado por camión.
- **Período anterior**: rango inmediatamente previo del mismo largo. Si el rango actual es del 1-30 abril, el anterior es del 2-31 marzo (aproximadamente).

---

## 5. Pendientes y mejoras futuras

- **Roles `PICKINERO` vs `CARGADOR`**: existe ambigüedad operativa que afecta cómo se asignan responsabilidades a los pallets. Pendiente brainstorming dedicado para revisar permisos, flujos y posible fusión/separación.
- **Modelo formal de turnos**: hoy `palletsPorTurno` aproxima usando "días distintos con actividad". Si en el futuro se introduce un modelo `Turno`, este KPI debería migrar a esa fuente.
- **Tendencias multi-período**: hoy comparamos solo contra el período anterior inmediato. Sería valioso ver tendencias de varios meses (gráfico de líneas).
