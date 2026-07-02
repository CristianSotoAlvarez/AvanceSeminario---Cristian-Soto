# Guía de prueba manual — recorrido completo del sistema

Esta guía te lleva **paso a paso** por todo el flujo real de DispatchTrack para que verifiques con tus propias manos que cada parte funciona. Está pensada para hacerse en orden, de principio a fin.

> **Consejo:** abrí esta guía en una ventana y la app (http://localhost:3000) en otra. Cada paso indica **con qué cuenta** entrar, **qué hacer** y **qué deberías ver** (✅). Las casillas `[ ]` son para que vayas marcando.

**Todas las cuentas usan la contraseña `clave123`.** Para cambiar de rol: cerrá sesión (ícono de salir arriba a la derecha) y volvé a entrar con otra cuenta.

---

## Preparación

- [ ] **0.1** Docker corriendo (Postgres + Redis). Si no: `docker compose up -d` en la carpeta del proyecto.
- [ ] **0.2** App corriendo: `npm run dev`. Esperá a ver "Ready" (web) y "Nest application successfully started" (API).
- [ ] **0.3** Abrí http://localhost:3000 → deberías ver la pantalla de login. ✅

---

## Recorrido 1 — Flujo NACIONAL completo (camino feliz)

Vamos a programar un camión nacional y llevarlo de principio a fin: llegada → andén → armado → carga → despacho.

### Paso 1.1 — Programar el camión (Coordinador de Transporte)

- [ ] Iniciá sesión con **`coord.transporte@dispatch.cl`**.
- [ ] Andá a **Camiones** (menú lateral) → botón **"Nuevo Camión"** (arriba a la derecha).
- [ ] Completá el formulario:
  - **Patente:** `PRUEBA01` (o la que quieras).
  - **Tipo:** `Nacional`.
  - **Cliente:** elegí cualquiera de la lista (ej. Walmart Chile).
  - **Hora de llegada planificada:** poné la hora actual aproximada (hoy).
  - **Hora de salida planificada:** unas 3 horas después.
  - **Paradas:** marcá el edificio **Aves** (botón del edificio). Dentro de la parada, **agregá 1-2 productos** con una cantidad (ej. 100).
- [ ] Tocá **Crear / Guardar**.
- [ ] ✅ El camión `PRUEBA01` aparece en la lista de Camiones en estado **ESPERADO**.

### Paso 1.2 — Registrar la llegada (Portería)

- [ ] Cerrá sesión. Iniciá con **`porteria@dispatch.cl`** → entrás directo a **Portería**.
- [ ] Buscá `PRUEBA01` en la lista de camiones del día (usá el buscador).
- [ ] Tocá **"Confirmar llegada"**.
- [ ] ✅ El camión queda marcado como **Registrado** con la hora actual.

> **Variante con QR (opcional):** en vez de la lista, podés abrir la hoja de ruta del camión (paso 1.6 explica cómo imprimirla) y escanear su QR con la cámara del teléfono → se abre `/p/...` → "Confirmar llegada".

### Paso 1.3 — Asignar un andén (Coordinador)

- [ ] Cerrá sesión. Iniciá con **`coordinador@dispatch.cl`**.
- [ ] Andá a **Andenes**. En la sección **"Cola de Operaciones"**, columna **En Portería**, encontrá `PRUEBA01`.
- [ ] Tocá **"Asignar → Aves"** y elegí un andén libre de Aves (A1-A5).
- [ ] ✅ El camión pasa a **ASIGNADO** y el andén elegido aparece **ocupado** (con el número del camión).

### Paso 1.4 — Crear los pallets a armar (desde el detalle del camión)

- [ ] Seguí con `coordinador@dispatch.cl` (o cualquier rol de gestión).
- [ ] Andá a **Camiones** → entrá a `PRUEBA01` (click en la fila).
- [ ] Bajá a la sección **Entregas**. Deberías ver la entrega de la parada de Aves.
- [ ] Tocá **"Nuevo pallet"** una o dos veces (crea pallets vacíos en estado EN ARMADO).
- [ ] ✅ Los pallets aparecen listados en la entrega.

### Paso 1.5 — Armar el pallet (Pickinero)

- [ ] Cerrá sesión. Iniciá con **`pickinero@dispatch.cl`** → entrás directo a **Picking**.
- [ ] ✅ Deberías ver el/los pallet(s) que creaste, agrupados por edificio (Aves).
- [ ] Tocá un pallet para abrir su detalle.
- [ ] Agregá productos con sus cantidades (usá los botones + / − o "Agregar producto").
- [ ] Tocá **"Marcar como Armado"**.
- [ ] ✅ El pallet pasa a estado **ARMADO** y desaparece de la lista de Picking.

### Paso 1.6 — Cargar el pallet (Cargador)

- [ ] Cerrá sesión. Iniciá con **`cargador@dispatch.cl`** → entrás directo a **Carga**.
- [ ] ✅ Deberías ver el pallet **ARMADO**, agrupado por camión (`PRUEBA01`).
- [ ] Tocá **"Marcar cargado"**.
- [ ] ✅ El pallet pasa a **CARGADO**. Cuando no quedan pallets, aparece "¡Todo al día!".

### Paso 1.7 — Marcar listo y despachar (Coordinador)

- [ ] Cerrá sesión. Iniciá con **`coordinador@dispatch.cl`**.
- [ ] Opción A — desde **Andenes**: entrá al andén ocupado por `PRUEBA01` (click) → en el panel lateral usá las acciones disponibles para avanzar el estado (finalizar carga → **Listo** → **Despachar**).
- [ ] Opción B — desde **Camiones** → `PRUEBA01`: usá los botones de transición de estado.
- [ ] Llevá el camión hasta **DESPACHADO**.
- [ ] ✅ El camión sale de la cola; el andén queda **libre** de nuevo.

> Para imprimir la hoja de ruta con QR de cualquier camión: entrá a su detalle (`/camiones/[id]`) → botón **Imprimir**.

**🎉 Recorrido 1 completo.** Llevaste un camión nacional de ESPERADO a DESPACHADO pasando por todos los roles.

---

## Recorrido 2 — Flujo EXPORTACIÓN (con túnel de frío y SAG)

Igual al recorrido 1, pero la exportación agrega dos pasos: túnel de frío e inspección SAG.

### Paso 2.1 — Programar camión de exportación

- [ ] Con **`coord.transporte@dispatch.cl`**, creá un **Nuevo Camión**:
  - Patente `EXPORT01`, **Tipo: Exportación**, un cliente exportador, parada en **Frigorífico** con productos.
- [ ] ✅ Aparece en ESPERADO.

### Paso 2.2 a 2.6 — Llegada, andén, armado, carga

- [ ] Repetí los pasos 1.2 a 1.6, pero asignando un andén de **Frigorífico** (F1-F3).
- [ ] Después de cargar los pallets, el camión queda listo para túnel.

### Paso 2.7 — Validar temperatura en túnel (Operador de Túnel)

- [ ] Cerrá sesión. Iniciá con **`tunel@dispatch.cl`** → entrás a **Túnel**.
- [ ] ✅ Deberías ver `EXPORT01` en el túnel (estado EN TÚNEL FRÍO).
- [ ] Registrá que alcanzó la temperatura objetivo.
- [ ] ✅ El camión pasa a **ESPERANDO SAG**.

### Paso 2.8 — Inspección SAG (Inspector SAG)

- [ ] Cerrá sesión. Iniciá con **`sag@dispatch.cl`** → entrás a **Exportaciones**.
- [ ] ✅ Deberías ver `EXPORT01` en la cola "Esperando SAG".
- [ ] Tocá **Aprobar** (o probá Rechazar y luego reenviar, para ver ese camino).
- [ ] ✅ El camión pasa a **APROBADO SAG**.

### Paso 2.9 — Listo y despachar

- [ ] Con `coordinador@dispatch.cl`, llevá `EXPORT01` a **LISTO** y luego **DESPACHADO**.
- [ ] ✅ Ciclo de exportación completo.

---

## Recorrido 3 — Manejo de incidentes

### 3A — Avería de camión con sustitución

- [ ] Con **`supervisor@dispatch.cl`**, creá o tomá un camión que **no esté despachado** (podés crear uno nuevo nacional y registrar su llegada y asignación, o usar uno en proceso).
- [ ] Entrá a su detalle en **Camiones → [el camión]**.
- [ ] Tocá el botón rojo **"Reportar avería"**.
- [ ] Escribí una descripción (mínimo 10 caracteres, ej. "Falla de motor en rampa").
- [ ] Elegí **"Sustituir por otro camión"** → ingresá una patente nueva (ej. `SUSTI01`) → Confirmar.
- [ ] ✅ El camión original queda **AVERIADO** con un enlace al sustituto; el camión `SUSTI01` aparece activo y heredó la carga.
- [ ] **Probá también "Esperar reparación in situ"** en otro camión: aparece un aviso amarillo "En reparación" y un botón **"Marcar reparado"**. ✅

### 3B — Andén fuera de servicio

- [ ] Con **`supervisor@dispatch.cl`** (o coordinador/jefe), andá a **Andenes**.
- [ ] Hacé click en un andén **libre** (sin camión) → se abre el panel lateral derecho.
- [ ] Tocá **"Marcar fuera de servicio"** → escribí un motivo (ej. "Rampa con falla") → Confirmar.
- [ ] ✅ El andén se ve en **rojo con ícono de llave** y el contador "Fuera de servicio" sube a 1.
- [ ] **Probá la regla de bloqueo:** intentá asignar un camión en portería a ese andén → el sistema **no lo permite** (mensaje "está fuera de servicio"). ✅
- [ ] **Probá la protección de ocupado:** hacé click en un andén **ocupado** → el botón "Marcar fuera de servicio" aparece **deshabilitado** con el aviso "Reasigna el camión primero". ✅
- [ ] Volvé a abrir el andén averiado → tocá **"Reactivar"**.
- [ ] ✅ El andén vuelve a estar **libre** y operativo.

---

## Recorrido 4 — Operador polivalente

- [ ] Iniciá con **`tomas.pickinero@dispatch.cl`** (pickinero polivalente).
- [ ] ✅ En la barra superior aparece la etiqueta morada **"Polivalente"** junto al rol.
- [ ] ✅ En el menú lateral ves **tanto Picking como Carga** (un pickinero normal solo vería Picking).
- [ ] Verificá que podés entrar a ambas pantallas y operar en las dos.
- [ ] Repetí con **`camila.cargador@dispatch.cl`** (cargador polivalente): ✅ ve Carga **y** Picking.

---

## Recorrido 5 — Verificar resultados en Reportes

- [ ] Iniciá con **`jefe@dispatch.cl`** → andá a **Reportes**.
- [ ] Elegí el rango **"30 días"**.
- [ ] ✅ Las 4 cards de KPI muestran valores (Cumplimiento de servicio, OTIF, % atrasos, Tiempo de ciclo), varias con el delta verde "vs período anterior".
- [ ] Pasá el mouse por el ícono **?** de cada KPI → ✅ aparece la definición.
- [ ] Revisá los widgets más abajo:
  - ✅ **Cumplimiento por tipo de cliente** (tabla con semáforo).
  - ✅ **Productividad de operadores** (alterná Pickineros / Cargadores).
  - ✅ **Incidentes operativos** (debería reflejar las averías que registraste en el recorrido 3).
- [ ] Tocá **PDF** → ✅ se genera un reporte limpio, sin menús, con encabezado "DispatchTrack — Reporte operacional".
- [ ] Tocá **CSV** → ✅ descarga la planilla con los datos.

---

## Checklist final de verificación

Si pudiste marcar todo lo de abajo, el sistema funciona end-to-end:

- [ ] Un camión nacional recorrió ESPERADO → DESPACHADO.
- [ ] Un camión de exportación pasó además por túnel y SAG.
- [ ] Los pallets fueron armados por un pickinero y cargados por un cargador (roles distintos).
- [ ] Registré una avería de camión (sustitución y/o reparación).
- [ ] Marqué un andén fuera de servicio, comprobé el bloqueo de asignación y lo reactivé.
- [ ] Un operador polivalente accede a Picking y Carga.
- [ ] Los reportes muestran KPIs, productividad e incidentes coherentes.

---

## Si algo no funciona

| Síntoma | Posible causa | Qué hacer |
|---|---|---|
| No carga la página / "Sesión expirada" | API caída | Revisá que `npm run dev` siga corriendo y la API en `localhost:3001` |
| "Can't reach database" en la consola | Docker apagado | `docker compose up -d` |
| No veo pallets en Picking | No se crearon desde el detalle del camión | Volvé al paso 1.4 (sección Entregas → "Nuevo pallet") |
| No puedo asignar un andén | El andén está ocupado o fuera de servicio | Elegí otro andén libre |
| Un rol no ve una pantalla | Es el comportamiento esperado (permisos por rol) | Revisá la matriz en [mapa-funcional.md](mapa-funcional.md#9-matriz-de-permisos-por-rol-resumen) |

Documentos relacionados: [manual-usuario.md](manual-usuario.md) · [mapa-funcional.md](mapa-funcional.md) · [guia de KPIs](../reportes/guia-kpis.md).
