# Rediseño de la sección de Reportes y KPIs

**Fecha:** 2026-05-06
**Autor:** Cristian Soto (con Claude Code)
**Estado:** Aprobado para implementación
**Audiencia objetivo del producto:** Jefe de logística / supervisor de planta (decisiones operativas)

## Contexto

La página `/reportes` (`apps/web/app/(platform)/reportes/page.tsx`) ya muestra 4 KPIs y 7 gráficos, pero varios widgets son **descriptivos** (composición, conteos) y no aportan a la decisión del supervisor. Este rediseño tiene dos objetivos:

1. **Que cada widget tenga sentido claro** — refactorizar los débiles, eliminar redundancias y agregar 2 indicadores accionables que hoy faltan.
2. **Documentar el "por qué" de cada widget** en `docs/reportes/guia-kpis.md`, para que cualquier persona del equipo entienda qué mide, por qué importa y qué decisión apoya.

## Alcance

### Dentro

- Refactor de la página de reportes existente.
- Nuevos cálculos en `apps/api/src/reportes/reportes.service.ts`.
- Nuevo documento `docs/reportes/guia-kpis.md`.

### Fuera (seguimientos)

- Clarificación de roles `PICKINERO` vs `CARGADOR` (en plataforma y modelo de datos). Tema mayor que merece su propia exploración.
- Reorganización por bloques temáticos de la página (queda como posible iteración 2).
- Tooltips/explicaciones en la UI (acordamos mantener la documentación solo en markdown).

## Cambios al producto

### KPIs (4 cards)

| Posición | KPI | Fórmula | Reemplaza a |
|---|---|---|---|
| 1 | **Cumplimiento de servicio** (%) | `Σ min(cantidadCargada, cantidadSolicitada) / Σ cantidadSolicitada` (a nivel `EntregaItem`) | Total camiones |
| 2 | **OTIF** (%) | Camiones con `On-Time AND In-Full` / camiones planificados con resultado conocido.<br>**On-Time** = `horaSalidaReal ≤ horaSalidaPlanificada` (sin margen de tolerancia).<br>**In-Full** = todas las líneas (`EntregaItem`) del camión con `cantidadCargada ≥ cantidadSolicitada` | Despachados |
| 3 | **% atrasos** | `atrasados / despachados` (sin cambios) | (mantener) |
| 4 | **Tiempo de ciclo promedio** | Sin cambios + sub-texto con delta vs período anterior | (mantener) |

Todos los KPIs muestran un **delta vs período anterior** (mismo largo del rango actual) en el sub-texto, para visibilizar tendencia.

### Widget refactorizado: tabla "Cumplimiento por tipo de cliente"

Reemplaza el donut "Distribución por tipo" (que solo mostraba composición).

| Tipo | Camiones | On-Time | Cumplimiento serv. | OTIF |
|---|---|---|---|---|
| Nacional | n | % | % | % |
| Exportación | n | % | % | % |
| Interplanta | n | % | % | % |

- Las celdas de % usan **semáforo de color**: rojo `<80%`, ámbar `80–90%`, verde `≥90%`.
- La columna OTIF queda visualmente destacada (es la métrica resumen).

**Por qué tabla y no gráfico:** solo hay 3 filas (3 tipos de cliente), un gráfico aporta poco; la tabla permite mostrar 4 métricas comparables con valores exactos para decidir.

### Widget nuevo: tabla "Productividad de operadores"

Toggle entre **Pickineros** y **Cargadores** (roles distintos, métricas comparables solo dentro del rol).

**Pickineros:**

| Operador | Pallets armados | Tiempo promedio/pallet | Pallets/turno |

**Cargadores:**

| Operador | Pallets cargados | Camiones atendidos | Pallets/turno |

Mini-resumen arriba: `# operadores activos | mediana de pallets/turno | desviación`.

**Fuente de datos:** `Pallet.pickineroId`, `Pallet.cargadorId`, `Pallet.tiempoArmadoSegundos`, `Pallet.timestampInicio/Fin` (todos ya presentes en el modelo).

### Widgets que se mantienen

- **Despachos por día** (barras)
- **Distribución por estado** (barras horizontales)
- **Inspecciones SAG** (incorpora *tiempo promedio en túnel de frío* como dato adicional dentro de este widget)
- **Tiempo por edificio vs presupuesto** (barras agrupadas)
- **Tabla mediana presupuesto** (motor IQR de 30 días)
- **Top causas de justificación** (barras horizontales)

Cada uno con su descripción canónica en `docs/reportes/guia-kpis.md`.

### Widget eliminado

- **Donut "Distribución por tipo"** — reemplazado por la tabla de cumplimiento por tipo (información más accionable).

## Derivación de `cantidadCargada`

`EntregaItem` solo persiste `cantidadSolicitada`. La cantidad efectivamente cargada se deriva en SQL agregando los pallets de la entrega:

```sql
SELECT
  ei."entregaId",
  ei."productoId",
  ei."cantidadSolicitada",
  COALESCE(SUM(pp.cantidad), 0) AS cantidadCargada
FROM entrega_items ei
LEFT JOIN pallets p     ON p."entregaId"   = ei."entregaId"
LEFT JOIN productos_pallet pp
       ON pp."palletId" = p.id AND pp."productoId" = ei."productoId"
GROUP BY ei.id;
```

**Regla para `ProductoPallet.productoId NULL`:** cuando un `ProductoPallet` no tiene producto vinculado (datos legacy o carga manual), no contribuye a `cantidadCargada` de ningún `EntregaItem` y se ignora en el cálculo. Estos casos se cuentan aparte como "items sin producto vinculado" y se reportan en el log para limpieza posterior, pero no distorsionan el % de cumplimiento.

## Cambios al backend

`apps/api/src/reportes/reportes.service.ts` debe agregar al payload del `resumen()`:

1. **`cumplimientoServicio`** (number, %): agregado de `Σ min(cargada, solicitada) / Σ solicitada` en el rango.
2. **`otif`** (number, %): camiones que cumplen On-Time AND In-Full, dividido por planificados.
3. **`cumplimientoPorTipo`**: array `[{ tipo, camiones, onTime, cumplimientoServicio, otif }]` — un registro por `TipoCamion`. Universo: camiones con `horaLlegadaPlanificada` en el rango y al menos una `Entrega` registrada. Camiones sin entregas se cuentan en `camiones` pero no entran al divisor de `cumplimientoServicio` (porque no tienen `EntregaItem` que sumar).
4. **`productividadOperadores`**: array de `[{ usuarioId, nombre, rol, palletsArmados?, tiempoPromedioSegundos?, palletsCargados?, camionesAtendidos?, diasActivos, palletsPorTurno }]`. Filtrable por rol desde el frontend con un solo payload, o dos endpoints si conviene.

   **Definición de "turno"**: el modelo no tiene tabla de turnos. `palletsPorTurno` se calcula como `palletsArmados / diasActivos` (o `palletsCargados / diasActivos` para cargadores), donde `diasActivos` = cantidad de días distintos del rango en los que el operador tiene al menos un `Pallet` con `timestampInicio` o `timestampFin` registrado. Esto aproxima jornadas laborales sin requerir un modelo nuevo.
5. **`comparativoPeriodoAnterior`**: bloque con los mismos KPIs (cumplimiento, OTIF, atrasos, ciclo) calculados sobre el período inmediatamente anterior del mismo largo, para los deltas en las cards.
6. **`tiempoPromedioTunelMinutos`** (opcional, dentro del bloque SAG): promedio de duración de la fase túnel de frío por camión de exportación. Se calcula desde `EventoCamion` como la diferencia entre el primer evento con `estado = EN_TUNEL_FRIO` y el siguiente evento con `estado` distinto, por camión. **No** se usa `EventoTunel` (esa tabla guarda registros puntuales de temperatura, no marca duraciones).

Las consultas existentes (`despachadosPorDia`, `porEstado`, `tiempoPorEdificio`, etc.) **se mantienen sin cambios**.

## Frontend

`apps/web/app/(platform)/reportes/page.tsx` debe:

- Adaptar las 4 cards de KPI a las nuevas métricas + sub-texto de delta.
- Reemplazar el componente `GraficoPie` por una nueva `TablaCumplimientoPorTipo`.
- Agregar `TablaProductividadOperadores` con toggle de rol.
- Actualizar `obtenerResumenReportesApi` y los tipos `ResumenReportes` en `apps/web/lib/api.ts` para reflejar el nuevo payload.
- Agregar al export CSV las nuevas secciones (`Cumplimiento por tipo`, `Productividad operadores`).

## Documento "guía de KPIs" (`docs/reportes/guia-kpis.md`)

Para cada widget (KPIs y gráficos), documentar:

1. **Qué mide** — definición y fórmula concreta.
2. **Por qué importa** — impacto en negocio / operación.
3. **Qué decisión apoya** — concreta, accionable por el supervisor.
4. **Cómo se interpreta** — rangos esperados, qué considerar bueno/malo.
5. **Fuentes de datos** — tablas y campos que alimentan el cálculo.

Estructura propuesta del archivo:

```
# Guía de KPIs — Reportes

## KPIs principales
### 1. Cumplimiento de servicio
### 2. OTIF
### 3. % atrasos
### 4. Tiempo de ciclo promedio

## Tablas
### Cumplimiento por tipo de cliente
### Productividad de operadores
### Mediana de presupuesto por edificio

## Gráficos
### Despachos por día
### Distribución por estado
### Tiempo por edificio vs presupuesto
### Inspecciones SAG (con tiempo en túnel)
### Top causas de justificación

## Apéndice — Fórmulas y definiciones de términos
```

## Riesgos y consideraciones

- **Cálculo de OTIF**: cuidar que los camiones aún no despachados en el rango no cuenten como "fallaron OTIF". El divisor son **camiones planificados con resultado conocido** (despachados o cancelados), no toda la flota futura.
- **Productividad de operadores**: si hay pallets sin `pickineroId/cargadorId` (datos viejos o casos manuales), el cálculo debe excluirlos para no distorsionar promedios.
- **Outliers en tiempo promedio/pallet**: un pallet de 3 horas (mal cerrado) puede empujar el promedio. Aplicar el mismo filtro IQR que ya usa el motor de medianas.
- **Período anterior**: si el rango actual incluye días futuros (poco común, pero el usuario puede ponerlo), el comparativo puede no ser válido. Validar en backend.
- **Comparativo en rangos cortos**: cuando el rango tiene menos de 3 días o el período actual o anterior tiene `< 5 camiones planificados`, el delta entre períodos es ruido. En esos casos el frontend **oculta el delta** y muestra solo el valor actual con la nota "muestra insuficiente para tendencia".
- **Migración del payload de `resumen()`**: el contrato cambia (campos nuevos, uno eliminado). Web y API se despliegan juntos en este proyecto (turbo monorepo), por lo que no hay riesgo de versiones desfasadas en producción. Aun así, durante el desarrollo, los nuevos campos se agregan **aditivamente** primero (sin remover los existentes) y los widgets antiguos se eliminan en el mismo PR que introduce los nuevos para evitar estados intermedios rotos.

## Seguimientos pendientes (fuera de alcance)

- **Pickinero vs Cargador**: la distinción genera confusión a nivel plataforma y posiblemente a nivel modelo. Requiere brainstorming dedicado: revisar permisos, flujos donde se asignan pallets, y si conviene fusionar/separar mejor los roles. No bloquea este rediseño.
