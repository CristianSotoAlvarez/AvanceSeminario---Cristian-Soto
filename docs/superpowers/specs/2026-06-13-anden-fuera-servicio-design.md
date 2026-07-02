# Andén fuera de servicio — diseño

**Fecha:** 2026-06-13
**Estado:** Aprobado para implementación
**Alcance:** permitir marcar un andén como "fuera de servicio" (averiado) y reactivarlo, evitando que reciba camiones mientras está caído. Solo estado actual, sin historial.

## Problema

Cuando un andén falla (mantenimiento, rotura), hoy no hay forma de marcarlo en el sistema. El supervisor sigue viéndolo como disponible y podría asignarle camiones. El único registro indirecto es justificar el atraso de los camiones afectados con la causa `FALLA_ANDEN`, que es a posteriori. Falta un flujo en vivo para sacar el andén de circulación.

## Decisiones tomadas (brainstorming)

- **Andén ocupado:** NO se puede marcar fuera de servicio si tiene un camión asignado. Hay que reasignar el camión primero (opción A: bloquear).
- **Permisos:** roles de gestión (JEFE_DESPACHO, COORDINADOR_TRANSPORTE, COORDINADOR, SUPERVISOR), con **motivo obligatorio**.
- **Alcance:** solo estado actual del andén. Sin tabla de historial (se puede agregar después si se necesita reporte de fallas por andén).

## Modelo de datos

Se agregan 4 campos al modelo `Anden`:

```prisma
model Anden {
  // ... campos existentes ...
  fueraDeServicio       Boolean   @default(false)
  motivoFueraServicio   String?
  fueraServicioDesde    DateTime?
  fueraServicioPorId    String?
  fueraServicioPor      Usuario?  @relation("AndenFueraServicio", fields: [fueraServicioPorId], references: [id])
}
```

Relación inversa en `Usuario`:

```prisma
model Usuario {
  // ...
  andenesFueraServicio  Anden[]  @relation("AndenFueraServicio")
}
```

No hay tablas nuevas.

## Backend

`andenes.controller.ts` (hoy solo tiene `GET /andenes`) suma dos endpoints, protegidos con `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles('JEFE_DESPACHO', 'COORDINADOR_TRANSPORTE', 'COORDINADOR', 'SUPERVISOR')`:

- **`PATCH /andenes/:id/fuera-servicio`** — body `{ motivo: string }` (requerido, mínimo 3 caracteres).
  - Carga el andén; si no existe → 404.
  - Si `ocupado === true` → 409 "El andén tiene un camión asignado. Reasígnalo antes de marcarlo fuera de servicio."
  - Si ya está `fueraDeServicio` → 409 "El andén ya está fuera de servicio."
  - Setea `fueraDeServicio = true`, `motivoFueraServicio = motivo`, `fueraServicioDesde = now()`, `fueraServicioPorId = usuarioId`.
- **`PATCH /andenes/:id/reactivar`**
  - Si no está fuera de servicio → 409 "El andén ya está operativo."
  - Limpia los 4 campos (`fueraDeServicio = false`, los demás a null).

Nuevo DTO `MarcarFueraServicioDto` con `class-validator` (`motivo: string`, `@IsNotEmpty`, `@MinLength(3)`).

`andenes.service.ts` implementa `marcarFueraServicio(id, motivo, usuarioId)` y `reactivar(id)`. El `listar()` existente debe incluir los nuevos campos y el `fueraServicioPor` (nombre) en el `select`/`include`.

**Garantía de concurrencia (sin lock pesimista):** para que el "segundo supervisor reciba 409" sea real sin usar `FOR UPDATE`, `marcarFueraServicio` usa un **`updateMany` condicional**: `update where { id, ocupado: false, fueraDeServicio: false }`. Si `count === 0`, se vuelve a leer el andén para devolver el 409 con el mensaje correcto (ocupado vs ya-fuera-de-servicio vs inexistente). Esto evita la condición de carrera de "leer-luego-escribir" sin la complejidad del lock que sí necesita la avería de camión (que muta 2 camiones + incidente de forma atómica). Análogamente, `reactivar` usa `updateMany where { id, fueraDeServicio: true }`.

**Eventos en tiempo real:** el tablero de andenes se consume en vivo y `camiones.service` ya emite `eventosGateway.emitirAndenesActualizados()` en cada cambio. `marcarFueraServicio` y `reactivar` **deben emitir el mismo evento** al terminar, o el tablero no se refresca hasta recargar. **`AndenesModule` hoy NO importa el gateway** → hay que importar `EventosModule` en `AndenesModule` e inyectar `EventosGateway` en `AndenesService`.

**Bloqueo de asignación:** en `camiones.service.ts → asignarAnden`, agregar la validación **justo después del check existente `if (anden.ocupado)`** (alrededor de la línea 193, donde el objeto `anden` ya está cargado). Si `anden.fueraDeServicio` → `BadRequestException` "El andén está fuera de servicio." (mismo tipo de excepción que usa el check de ocupado, por consistencia).

## Frontend

`apps/web/lib/api.ts`:
- Extender la interfaz `Anden` con los 4 campos nuevos + `fueraServicioPor?: { nombre: string } | null`.
- Funciones `marcarAndenFueraServicioApi(id, motivo)` y `reactivarAndenApi(id)`.

`apps/web/app/(platform)/andenes/page.tsx`:
- **Tarjeta de andén operativo y libre:** acción "Marcar fuera de servicio" (ícono de avería). Abre un mini-modal que pide el **motivo** y confirma.
- **Tarjeta de andén ocupado:** la acción de marcar fuera de servicio aparece **deshabilitada** con tooltip "Reasigna el camión primero".
- **Tarjeta de andén fuera de servicio:** estilo visual distintivo (gris/atenuado + ícono ⚠️), badge "FUERA DE SERVICIO", muestra el motivo y "desde HH:MM". Botón **"Reactivar"**.
- **Resumen superior** (hoy "Total / Ocupados"): se agrega contador **"Fuera de servicio"**.

Solo los roles de gestión ven las acciones (el resto ve el estado pero sin botones).

## Riesgos y consideraciones

- **Concurrencia:** dos supervisores marcando el mismo andén. La validación de estado dentro de la operación basta para este caso de baja frecuencia (el segundo recibe 409). No requiere lock pesimista como en avería de camión.
- **Andén fuera de servicio que aún figura como destino de paradas planificadas:** la validación en `asignarAnden` impide nuevas asignaciones; las paradas ya planificadas a ese andén tendrán que reasignarse manualmente (fuera de alcance de esta iteración).
- **Reactivación:** cualquier rol de gestión puede reactivar, no solo quien lo marcó. Es intencional (turnos distintos).

## Seguimientos (fuera de alcance)

- **Historial de fallas de andén** (tabla de incidentes de andén) para un reporte "tiempo fuera de servicio por andén". Se decidió no incluirlo ahora.
- **Reasignación masiva** de camiones/paradas cuando un andén cae con trabajo planificado.
