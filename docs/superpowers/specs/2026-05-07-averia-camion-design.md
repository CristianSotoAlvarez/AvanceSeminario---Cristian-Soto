# Manejo de avería de camión — flujo operativo

**Fecha:** 2026-05-07
**Autor:** Cristian Soto (con Claude Code)
**Estado:** Aprobado para implementación
**Alcance:** primer caso del proyecto "manejo de incidentes operativos". Cubre solo *avería de camión* en sus dos modalidades (espera in situ y sustitución de patente). Casos futuros (falta de producto, cambio de andén, reprogramación) reusan el modelo `IncidenteCamion` que se introduce aquí.

## Contexto

El sistema actualmente solo modela el camino feliz del ciclo en planta. Cuando un camión sufre una avería:

- **Caso A — leve, reparable in situ**: hoy el camión se queda atascado en su estado, el supervisor justifica el atraso a posteriori con `FALLA_MECANICA`. No hay forma de marcar "en pausa" en vivo, ni de medir cuánto tiempo estuvo en reparación.
- **Caso B — sustitución de patente**: hoy no hay forma de registrar que un camión nuevo (Y) reemplaza al averiado (X) y toma su carga. El supervisor debe duplicar registros manualmente, perdiendo trazabilidad.

Casi nunca se cancela el viaje (caso C), por lo que queda fuera de alcance.

## Audiencia / decisión que apoya

- **Jefe de despacho / coordinador**: registrar el incidente en vivo, decidir entre esperar reparación o sustituir, y mantener el flujo del pedido sin perder trazabilidad.
- **Supervisor**: ver de un vistazo qué camiones están detenidos por avería y por cuánto tiempo.
- **Gerencia / mejora continua**: medir frecuencia de averías y separar "incidentes" de "fallas de cumplimiento" en los KPIs.

## Cambios al modelo de datos

### Estado nuevo

`EstadoCamion` agrega:

- `AVERIADO` — terminal. El camión X que fue sustituido por avería queda aquí. No vuelve a operar.

### Campos nuevos en `Camion`

- `enReparacion: Boolean @default(false)` — flag de pausa para caso A.
- `reparacionDesde: DateTime?` — timestamp de inicio de la pausa.
- `reemplazadoPorId: String?` — apunta al camión Y que sustituyó a este X (caso B).
- Relación inversa `reemplaza: Camion?` (Y conoce a quién sustituye).

### Modelo nuevo `IncidenteCamion`

Genérico, pensado para reutilizarse en los próximos escenarios (falta de producto, cambio de andén, reprogramación).

```prisma
model IncidenteCamion {
  id                       String           @id @default(cuid())
  camionId                 String
  camion                   Camion           @relation("IncidentesDeCamion", fields: [camionId], references: [id])
  tipo                     TipoIncidente
  accion                   AccionIncidente
  estadoCamionEnIncidente  EstadoCamion
  descripcion              String
  registradoPorId          String
  registradoPor            Usuario          @relation(fields: [registradoPorId], references: [id])
  timestamp                DateTime         @default(now())
  resueltoEn               DateTime?
  camionReemplazoId        String?
  camionReemplazo          Camion?          @relation("ReemplazoIncidente", fields: [camionReemplazoId], references: [id])

  @@index([camionId])
  @@index([tipo])
  @@map("incidentes_camion")
}
```

**Relaciones inversas requeridas en `Camion`** (para que la migración de Prisma no falle):

```prisma
model Camion {
  // ... campos existentes ...
  reemplazadoPorId          String?
  reemplazadoPor            Camion?           @relation("SustitucionPorAveria", fields: [reemplazadoPorId], references: [id])
  reemplaza                 Camion[]          @relation("SustitucionPorAveria")
  incidentes                IncidenteCamion[] @relation("IncidentesDeCamion")
  incidentesComoReemplazo   IncidenteCamion[] @relation("ReemplazoIncidente")
}

enum TipoIncidente {
  AVERIA
  FALTA_PRODUCTO     // futuro
  CAMBIO_ANDEN       // futuro
  REPROGRAMACION     // futuro
}

enum AccionIncidente {
  ESPERAR_REPARACION
  SUSTITUIR
  // futuro: REGISTRAR_FALTANTE, REASIGNAR_ANDEN, REPROGRAMAR
}
```

En esta iteración solo se usan `TipoIncidente.AVERIA` y `AccionIncidente.ESPERAR_REPARACION` o `SUSTITUIR`.

## Reglas de transición en sustitución (caso B)

Cuando un camión X se sustituye por Y, el estado de Y depende del estado actual de X y del tipo de camión:

| Estado de X al sustituir | NACIONAL / INTERPLANTA | EXPORTACION |
|---|---|---|
| ESPERADO / EN_PORTERIA / ASIGNADO | Y arranca en `ASIGNADO` (toma el andén de X) | Igual |
| EN_CARGA | Y arranca en `EN_CARGA` (continúa la carga) | Igual |
| EN_TUNEL_FRIO / ESPERANDO_SAG / RECHAZADO_SAG | (no aplica) | Y arranca en el mismo estado (debe re-pasar SAG) |
| APROBADO_SAG / LISTO | Y arranca en `LISTO` | **Y vuelve a `EN_TUNEL_FRIO`**, debe re-pasar SAG |

**Regla SAG**: la inspección se realiza sobre la patente y los sellos físicos del camión. Si X es exportación y ya pasó SAG, Y NO hereda esa aprobación. Las `InspeccionSAG` de X se mantienen asociadas a X (audit), no se duplican ni se mueven a Y.

## Workflow operativo

### Punto de entrada

Página `/camiones/[id]`: botón **"Reportar avería"** visible cuando `estado ∈ {EN_PORTERIA, ASIGNADO, EN_CARGA, EN_TUNEL_FRIO, ESPERANDO_SAG, RECHAZADO_SAG, APROBADO_SAG, LISTO}`. Oculto si `DESPACHADO` o `AVERIADO`. Si el camión ya está `enReparacion=true`, el botón cambia a **"Marcar reparado"**.

### Modal "Reportar avería"

Campos:

- **Descripción del problema** — texto libre, requerido (mínimo 10 caracteres).
- **Acción a tomar** — radio con dos opciones:
  - "Esperar reparación in situ" (caso A).
  - "Sustituir por otro camión" (caso B). Habilita formulario adicional.
- Si elige sustituir: **patente del camión nuevo** (requerida) y **número de transporte** (opcional).

Si X es EXPORTACION y `estado ∈ {APROBADO_SAG, LISTO}`, el modal muestra una alerta visible: *"Este camión es de exportación y ya pasó SAG. El camión sustituto deberá pasar inspección SAG nuevamente. La aprobación previa no se hereda."*

### Caso A — esperar reparación

Endpoint: `POST /camiones/:id/incidente` con body `{ tipo: 'AVERIA', accion: 'ESPERAR_REPARACION', descripcion }`.

Acciones del backend (en transacción):

1. `Camion.enReparacion = true`, `Camion.reparacionDesde = now()`.
2. Crear `IncidenteCamion` con tipo `AVERIA`, acción `ESPERAR_REPARACION`, snapshot del estado actual.
3. Crear `EventoCamion` con la nota "Inicio de reparación in situ".

El estado del camión NO cambia. Sigue donde estaba. El tiempo en reparación se cuenta como atraso normal (no requiere lógica nueva: `horaSalidaReal > horaSalidaPlanificada` lo captura).

**UI tras la acción:** banner amarillo persistente en la página del camión: *"En reparación desde HH:MM (Hh Mm)"*. Aparece botón **"Marcar reparado"**.

Al marcar reparado: `enReparacion = false`, `IncidenteCamion.resueltoEn = now()`, evento de "Reparación finalizada". El camión continúa su flujo normal. El supervisor luego justifica el atraso final con `FALLA_MECANICA` (flujo existente).

### Caso B — sustitución

Endpoint: `POST /camiones/:id/incidente` con body `{ tipo: 'AVERIA', accion: 'SUSTITUIR', descripcion, patenteNueva, numeroTransporteNuevo? }`.

Validaciones del backend (antes de mutar):

- X.estado ∈ estados permitidos (no DESPACHADO ni AVERIADO).
- `patenteNueva` no está en uso por otro camión activo (estado distinto de DESPACHADO y AVERIADO).
- Si se envía `numeroTransporteNuevo`, validar unicidad.

Acciones del backend (en una sola transacción):

1. Crear camión Y con: `tipo`, `clienteId`, `pedidoId`, `andenId`, `horaLlegadaPlanificada`, `horaSalidaPlanificada`, `cargaPreviaDescripcion` heredados de X.
2. `Y.patente = patenteNueva`, `Y.numeroTransporte = numeroTransporteNuevo`, `Y.horaLlegadaReal = X.horaLlegadaReal` (no se pierde la llegada original).
3. `Y.estado` según la tabla de reglas de transición (sección "Reglas de transición").
4. `UPDATE entregas SET camionId = Y.id WHERE camionId = X.id` (los pallets siguen las entregas vía `Pallet.entregaId`).
5. `UPDATE paradas_expedicion SET camionId = Y.id WHERE camionId = X.id` (manteniendo `orden` y `estado`).
6. Las `InspeccionSAG` de X NO se mueven (quedan como audit de X).
7. `X.estado = AVERIADO`, `X.andenId = null`, `X.reemplazadoPorId = Y.id`.
8. Crear `IncidenteCamion` con tipo `AVERIA`, acción `SUSTITUIR`, `camionReemplazoId = Y.id`, snapshot del estado de X al momento del incidente.
9. `EventoCamion` para X (estado `AVERIADO`) y para Y (su estado inicial).

**UI tras la sustitución:**

- Página de X muestra banner rojo: *"Camión averiado el HH:MM, sustituido por [patente Y] →"* (link a Y).
- Página de Y muestra banner azul: *"Sustituyó al camión averiado [patente X] ←"* (link a X).
- En `/camiones`, X queda filtrable por estado `AVERIADO`; Y aparece como camión activo en su nuevo estado.

## Impacto en reportes existentes

### Regla de exclusión

Los camiones con `estado = AVERIADO` se **excluyen** del cálculo de:

- **Cumplimiento de servicio** y **OTIF** — solo el camión que efectivamente despacha (Y) entra al universo. X averiado no se cuenta como falla OTIF; se cuenta como incidente.
- **% atrasos** — igual lógica.
- **Tiempo de ciclo** — solo el camión final.
- **Tabla "Cumplimiento por tipo de cliente"** — el `count` por tipo refleja camiones operacionales, no incluye AVERIADO.
- **`totalCamiones`** del KPI principal — para no inflar el volumen con la suma de X + Y.
- **`despachadosPorDia`**, **`porEstado`**, **`camionesTorta`**: los conteos generales también excluyen AVERIADO. De lo contrario X aparecería en `porEstado` como AVERIADO inflando la distribución, y `camionesTorta` contaría X y Y por separado por tipo, duplicando volumen.
- **Tiempo por edificio**, **mediana de presupuesto**: las `ParadaExpedicion` se mueven a Y junto con la carga, así que cuentan una sola vez (no doble) al asociarse al camión final.

Implementación: agregar `c.estado != 'AVERIADO'` a **todas** las queries de `ReportesService` que cuentan camiones (no solo OTIF). Concretamente:

- Filtros `where: { horaLlegadaPlanificada: rango }` se completan con `estado: { not: 'AVERIADO' }`.
- En consultas raw, agregar `AND estado != 'AVERIADO'` o `AND c.estado != 'AVERIADO'` según el alias.
- El widget "Distribución por estado" (`porEstado`) aún puede ser informativo de cuántos AVERIADO hubo, pero como cifra aparte, no dentro del flujo normal. **Decisión**: se excluyen del bloque "Distribución por estado" para mantenerlo limpio; los AVERIADO viven en el widget "Incidentes operativos".

**Excepción**: el helper `calcularTiempoTunel` usa `EventoCamion`, no `camiones.estado`. Como X averiado puede tener eventos `EN_TUNEL_FRIO` antes de la avería, esos eventos cuentan al promedio de tiempo en túnel solo si tienen un evento siguiente (transición). Si el túnel quedó interrumpido por la avería, `LEAD()` puede devolver el evento `AVERIADO` como siguiente, lo que distorsiona el promedio. **Mitigación**: filtrar `WHERE proximo_estado != 'AVERIADO'` en la CTE para no contaminar la métrica con casos truncados.

### Widget nuevo "Incidentes operativos"

En `/reportes`, nuevo bloque con tabla:

| Tipo de incidente | Cantidad | % del total |
|---|---|---|
| Averías con sustitución | n | x% |
| Averías con reparación in situ | n | x% |

Universo: incidentes con `timestamp` en el rango. Más adelante esta tabla crece para `FALTA_PRODUCTO`, `CAMBIO_ANDEN`, `REPROGRAMACION`.

**Decisión que apoya:**

- Si "averías con sustitución" sube de mes a mes → revisar mantenimiento de flota.
- Si "reparación in situ" lidera → analizar tiempo medio de reparación (métrica futura) y si bloquea andenes críticos.

### Documentación

- Sección nueva "Incidentes" en `docs/reportes/guia-kpis.md`.
- Sub-sección en KPIs principales aclarando la **regla de exclusión** (camiones AVERIADO no entran al universo OTIF).

## Cambios al backend (concretos)

- `apps/api/src/prisma/schema.prisma` — nuevo estado, nuevos campos, nuevo modelo, nuevos enums.
- Migración Prisma con `prisma migrate dev`.
- `apps/api/src/camiones/camiones.controller.ts` — endpoints nuevos:
  - `POST /camiones/:id/incidente` — registra avería con la acción elegida.
  - `POST /camiones/:id/marcar-reparado` — cierra reparación in situ.
- `apps/api/src/camiones/camiones.service.ts` — nuevos métodos `registrarIncidente()` y `marcarReparado()`. La lógica de sustitución se concentra en un método privado `sustituirCamionPorAveria()` para mantener la transacción aislada.
- `apps/api/src/camiones/dto/registrar-incidente.dto.ts` — DTO con `class-validator`.
- `apps/api/src/reportes/reportes.service.ts`:
  - Agregar filtro `estado != AVERIADO` en queries de OTIF, cumplimiento, atrasos, ciclo.
  - Nuevo helper `calcularIncidentesOperativos(desde, hasta)` que retorna el array para el widget.
  - Extender payload del `resumen()` con `incidentesOperativos`.
- Permisos: las acciones de incidente las pueden ejecutar `JEFE_DESPACHO`, `COORDINADOR_TRANSPORTE`, `COORDINADOR`, `SUPERVISOR`.

## Cambios al frontend (concretos)

- `apps/web/lib/api.ts` — nuevos tipos `Incidente`, extender `Camion` con campos nuevos, agregar `incidentesOperativos` a `ResumenReportes`.
- `apps/web/app/(platform)/camiones/[id]/page.tsx`:
  - Botón "Reportar avería" + modal.
  - Banners según estado (`enReparacion`, `AVERIADO`, sustituido por / sustituye a) con links cruzados.
  - Botón "Marcar reparado" cuando `enReparacion=true`.
- `apps/web/app/(platform)/camiones/page.tsx` — badge de estado AVERIADO en la lista.
- `apps/web/app/(platform)/reportes/page.tsx` — widget "Incidentes operativos".

## Riesgos y mitigaciones

- **Concurrencia**: dos supervisores marcando avería del mismo camión al mismo tiempo. **Mitigación**: dentro de la transacción, ejecutar `SELECT id, estado FROM camiones WHERE id = $1 FOR UPDATE` (vía `prisma.$queryRaw`) **antes** de validar el estado. Esto bloquea la fila a nivel de base de datos hasta que la transacción termine. La validación con `read-committed` por sí sola no basta: dos transacciones simultáneas podrían pasar el chequeo y ambas mutar. Si la fila ya está bloqueada, la segunda transacción espera; cuando obtiene el lock encuentra `estado = AVERIADO` y devuelve 409.
- **Patente duplicada al sustituir**: validar que la patente nueva no esté en uso por un camión activo (no DESPACHADO ni AVERIADO).
- **Número de transporte duplicado**: el campo es único en el schema; validar antes de la transacción para dar error claro.
- **Andén liberado vs tomado por Y**: como ambas operaciones ocurren en la misma transacción, no hay ventana de conflicto.
- **Pallets en estado intermedio (EN_ARMADO/ARMADO)**: siguen apuntando a su `Entrega`, que ahora pertenece a Y. La continuidad del pickinero no se interrumpe.
- **Sustitución revertida**: no se permite en v1. Si el supervisor se equivocó, queda en el audit; debe abrir un ticket o usar otra herramienta administrativa.
- **Re-sustitución en cadena**: si Y también se avería, puede sustituirse por Z. El campo `reemplazadoPorId` arma la cadena natural. La UI debe mostrar la cadena completa cuando existe. El widget "Incidentes operativos" cuenta **eventos**, no camiones únicos: una cadena X→Y→Z genera 2 incidentes AVERIA/SUSTITUIR distintos, lo cual es lo que se quiere medir (cada avería operacional).
- **Pallet.pedidoId** apunta directamente al `Pedido`, independiente de la entrega. La sustitución no toca `Pedido`, solo mueve `Entrega.camionId` y `ParadaExpedicion.camionId` de X a Y. El pallet sigue apuntando al mismo pedido — correcto, no requiere cambios adicionales.

## Seguimientos pendientes (fuera de alcance)

- **Falta de producto** (próxima iteración) — flujo en vivo para registrar entrega parcial / faltante. Reutiliza `IncidenteCamion` con `TipoIncidente.FALTA_PRODUCTO`.
- **Cambio de andén** — endpoint dedicado con motivo + audit. `TipoIncidente.CAMBIO_ANDEN`.
- **Reprogramación de horario** — cambio de `horaLlegadaPlanificada` o `horaSalidaPlanificada` con motivo. `TipoIncidente.REPROGRAMACION`.
- **Tiempo medio de reparación**: métrica nueva en reportes una vez que tengamos volumen de incidentes ESPERAR_REPARACION cerrados.
- **Cancelación de viaje** (caso C, descartado por ahora) — si en el futuro se necesita, se modela como nueva acción `CANCELAR` en el mismo modelo.
- **Roles `PICKINERO` vs `CARGADOR`**: pendiente del rediseño de reportes; sigue abierto.
