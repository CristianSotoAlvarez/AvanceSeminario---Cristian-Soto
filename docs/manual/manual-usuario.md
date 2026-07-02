# Manual de usuario — DispatchTrack

Manual paso a paso organizado **por rol**. Cada sección describe qué ve esa persona al entrar, qué tareas realiza y cómo. Para la referencia técnica de permisos y endpoints, ver [mapa-funcional.md](mapa-funcional.md).

**Acceso:** todas las cuentas de prueba usan la contraseña `clave123`. Se inicia sesión en `/login` con el correo o RUT.

## Índice de roles

1. [Portero](#1-portero) — registra la llegada de camiones
2. [Coordinador de Transporte](#2-coordinador-de-transporte) — programa los camiones del día
3. [Coordinador](#3-coordinador) — asigna andenes y mueve el flujo
4. [Pickinero](#4-pickinero) — arma los pallets
5. [Cargador](#5-cargador) — carga los pallets al camión
6. [Operador de Túnel de Frío](#6-operador-de-túnel-de-frío) — valida temperatura (exportación)
7. [Inspector SAG](#7-inspector-sag) — aprueba/rechaza exportaciones
8. [Supervisor](#8-supervisor) — opera todo y resuelve incidentes
9. [Jefe de Despacho](#9-jefe-de-despacho) — administra el sistema completo
10. [Operadores polivalentes](#10-operadores-polivalentes) — arman y cargan

---

## 1. Portero

**Cuenta de ejemplo:** `porteria@dispatch.cl`
**Pantalla principal:** `/porteria`

### Qué hace
Registra cuándo cada camión llega físicamente a la planta. Es el primer eslabón del ciclo.

### Cómo registrar una llegada

**Opción A — el conductor trae la hoja de ruta con QR (más rápido):**
1. El conductor muestra la hoja impresa (o la imagen en su teléfono) con el código QR.
2. Escaneás el QR con la **cámara normal** de tu tablet o celular (no necesitas abrir la app).
3. Se abre una pantalla con los datos del camión (patente, tipo, cliente, hora planificada).
4. Verificá que coincidan con el camión real y tocá **"Confirmar llegada"**.
5. Aparece la confirmación con la hora. Listo, podés escanear el siguiente.

**Opción B — el conductor no trae la hoja (desde la pantalla de portería):**
1. Iniciá sesión en `/login` con la cuenta de portería.
2. En `/porteria` ves la lista de camiones planificados para hoy.
3. Buscá la patente del camión que llegó (usá el buscador arriba).
4. Tocá **"Confirmar llegada"** junto a ese camión.
5. El camión queda marcado como "Registrado".

### Notas
- La lista se actualiza sola cada 30 segundos.
- Si un camión ya fue registrado, el sistema te avisa con la hora en que llegó.
- No podés ver reportes ni otras secciones: tu pantalla está enfocada solo en registrar llegadas.

---

## 2. Coordinador de Transporte

**Cuenta de ejemplo:** `coord.transporte@dispatch.cl`
**Pantalla principal:** `/dashboard`

### Qué hace
Programa los camiones que llegarán (la "agenda" del día), y mantiene los catálogos de clientes y productos.

### Tareas
- **Programar un camión:** registrar patente, tipo (Nacional/Exportación/Interplanta), cliente, hora de llegada planificada y las paradas por edificio.
- **Gestionar clientes:** en `/configuracion/clientes`, dar de alta clientes nacionales, interplanta y exportadores.
- **Gestionar productos:** en `/configuracion/productos`, mantener el catálogo (incluye importar por CSV).
- **Reportar avería de camión:** si un camión programado se avería, desde `/camiones/[id]` (ver sección Supervisor para el detalle).
- **Ver reportes:** acceso completo a `/reportes`.

---

## 3. Coordinador

**Cuenta de ejemplo:** `coordinador@dispatch.cl`
**Pantalla principal:** `/dashboard`

### Qué hace
Mueve el flujo de los camiones dentro de la planta: asigna andenes y avanza estados.

### Tareas principales

**Asignar un andén a un camión que llegó:**
1. Andá a `/andenes` o entrá al detalle del camión en `/camiones/[id]`.
2. En un camión en estado "EN PORTERÍA", tocá **"Asignar"** y elegí el andén libre.
3. El camión pasa a "ASIGNADO" y puede empezar la carga.

**Marcar listo / despachar:**
- Cuando un camión terminó (y, si es exportación, pasó SAG), marcalo **"LISTO"** y luego **"DESPACHAR"** desde `/camiones/[id]` o `/andenes`.

**Justificar un atraso:**
1. En `/camiones/[id]`, en la parada atrasada, tocá **"Justificar"**.
2. Elegí la causa (Falla de andén, Falta de personal, Falta de producto, etc.) y describí.
3. Marcá si debe excluirse del cálculo de tiempos (cuando es un evento externo justificado).

**Reportar avería de camión:** igual que el supervisor (ver sección 8).

---

## 4. Pickinero

**Cuenta de ejemplo:** `pickinero@dispatch.cl`
**Pantalla principal:** `/picking`

### Qué hace
Arma los pallets con los productos que pide cada entrega.

### Cómo armar un pallet
1. En `/picking` ves los pallets en armado, agrupados por edificio (Aves, Cerdo, Frigorífico).
2. Tocá un pallet para abrir su detalle en `/pallets/[id]`, o escaneá su QR con el botón de escáner.
3. Agregá los productos y las cantidades solicitadas.
4. Cuando el pallet esté completo, **cerralo** (pasa de "EN ARMADO" a "ARMADO"). Queda disponible para que el cargador lo cargue.

### Notas
- Si no hay pallets pendientes, la pantalla te lo indica; volvé cuando lleguen camiones nuevos.
- El sistema registra que **vos** armaste el pallet (queda en la trazabilidad).
- Solo ves la pantalla de Picking (a menos que seas polivalente, ver sección 10).

---

## 5. Cargador

**Cuenta de ejemplo:** `cargador@dispatch.cl`
**Pantalla principal:** `/carga`

### Qué hace
Carga al camión los pallets que el pickinero ya armó.

### Cómo cargar un pallet
1. En `/carga` ves los pallets armados pendientes, agrupados por camión.
2. Escaneá el QR del pallet o ubicalo en la lista.
3. Tras subirlo al camión, tocá **"Marcar cargado"** (pasa de "ARMADO" a "CARGADO").

### Notas
- "¡Todo al día!" significa que no hay pallets pendientes de carga.
- El sistema registra que **vos** cargaste el pallet.
- Solo ves la pantalla de Carga (a menos que seas polivalente, ver sección 10).

---

## 6. Operador de Túnel de Frío

**Cuenta de ejemplo:** `tunel@dispatch.cl`
**Pantalla principal:** `/tunel`

### Qué hace
Para camiones de **exportación**, valida que la carga alcanzó la temperatura objetivo (−18 °C) antes de pasar a inspección SAG.

### Cómo validar
1. En `/tunel` ves los camiones de exportación en el túnel.
2. Cuando un camión alcanzó la temperatura, registralo: pasa de "EN TÚNEL FRÍO" a "ESPERANDO SAG".
3. El camión queda en cola para el inspector SAG.

---

## 7. Inspector SAG

**Cuenta de ejemplo:** `sag@dispatch.cl`
**Pantalla principal:** `/exportaciones`

### Qué hace
Inspecciona los camiones de exportación y decide si cumplen para salir.

### Cómo inspeccionar
1. En `/exportaciones` ves la cola de camiones "ESPERANDO SAG".
2. Revisá el camión y:
   - **Aprobar:** el camión pasa a "APROBADO SAG" y puede marcarse listo.
   - **Rechazar:** el camión pasa a "RECHAZADO SAG". Tras corregir, se puede reenviar a inspección.
3. Podés agregar observaciones en cada inspección.

### Notas
- Solo intervenís en camiones de exportación.
- Si un camión averiado de exportación fue sustituido, el camión nuevo **debe volver a pasar SAG**: la aprobación no se hereda.

---

## 8. Supervisor

**Cuenta de ejemplo:** `supervisor@dispatch.cl`
**Pantalla principal:** `/dashboard`

### Qué hace
Tiene visión transversal: puede operar cualquier pantalla operativa, resolver incidentes y ver reportes.

### Reportar una avería de camión (paso clave)
1. Entrá al detalle del camión en `/camiones/[id]`.
2. Tocá el botón rojo **"Reportar avería"** (visible mientras el camión no esté despachado ni ya averiado).
3. Escribí la descripción del problema (mínimo 10 caracteres).
4. Elegí la acción:
   - **Esperar reparación in situ:** el camión queda pausado donde está. Aparece un aviso amarillo "En reparación". Cuando se repare, tocá **"Marcar reparado"** y sigue su flujo normal.
   - **Sustituir por otro camión:** ingresá la patente del camión nuevo. El sistema:
     - crea el camión sustituto,
     - le traspasa la carga (entregas y paradas),
     - marca el camión averiado como "AVERIADO" con un enlace al sustituto.
   - Si es **exportación** y ya pasó SAG, el sistema te avisa que el sustituto deberá pasar SAG de nuevo.

### Marcar un andén fuera de servicio
1. Andá a `/andenes` y hacé click en el andén que falló (se abre el panel lateral).
2. Tocá **"Marcar fuera de servicio"** y escribí el motivo (ej: "Rampa hidráulica con falla").
3. El andén queda marcado en rojo con ícono de llave y **deja de recibir camiones**.
   - Si el andén tiene un camión cargando, el botón aparece deshabilitado: primero reasigná ese camión a otro andén.
4. Cuando se repare, abrí el andén y tocá **"Reactivar"** para volverlo operativo.

### Otras tareas
- **Justificar atrasos** (incluida la causa "Falla de andén").
- **Asignar andenes, marcar listo, despachar.**
- **Operar Picking, Carga, Túnel y SAG** en caso de emergencia.
- **Ver reportes** completos.

### Dónde ver los incidentes registrados
- En `/reportes`, el widget **"Incidentes operativos"** muestra el total de averías (con reparación o con sustitución) del período.
- En `/camiones`, los camiones averiados aparecen con la etiqueta **AVERIADO**.

---

## 9. Jefe de Despacho

**Cuenta de ejemplo:** `jefe@dispatch.cl`
**Pantalla principal:** `/dashboard`

### Qué hace
Rol administrador. Puede todo lo que hace el supervisor **más** la administración del sistema.

### Tareas exclusivas / administrativas
- **Configuración general** del sistema (`/configuracion`).
- **Gestión de usuarios:** crear, editar y desactivar cuentas y roles.
- **Gestión de clientes y productos.**
- **Verificar pallets** (paso final de control de calidad del pallet: CARGADO → VERIFICADO).
- Acceso total a reportes, incidentes y todas las pantallas operativas.

### Cómo generar un reporte para imprimir/PDF
1. Andá a `/reportes`.
2. Elegí el rango de fechas (por ejemplo, "30 días").
3. Revisá los KPIs y gráficos. Cada KPI tiene un ícono **?** con su definición.
4. Tocá **PDF** (o **CSV** para datos en planilla). El PDF sale limpio, sin menús, con encabezado del reporte.

---

## 10. Operadores polivalentes

Algunos operarios están marcados como **polivalentes** porque, según el turno, arman **y** cargan. (Cuentas de ejemplo: `tomas.pickinero@dispatch.cl`, `camila.cargador@dispatch.cl`.)

### Qué cambia para ellos
- Un **pickinero polivalente** también ve y usa la pantalla `/carga`.
- Un **cargador polivalente** también ve y usa la pantalla `/picking`.
- En la barra superior aparece una etiqueta morada **"Polivalente"** junto a su rol.

### Por qué existe
El protocolo de trazabilidad exige separar quién arma y quién carga, pero en la operación diaria una misma persona puede hacer ambas cosas. El sistema concilia ambas realidades: habilita las dos pantallas para el polivalente, pero **siempre registra por separado** quién armó (`pickinero`) y quién cargó (`cargador`) cada pallet, preservando la trazabilidad para auditorías.

---

## Apéndice — Glosario rápido de estados del camión

| Estado | Significa |
|---|---|
| ESPERADO | Programado, aún no llega |
| EN PORTERÍA | Llegó a la planta |
| ASIGNADO | Tiene un andén asignado |
| EN CARGA | Cargándose en el andén |
| EN TÚNEL FRÍO | (Exportación) enfriando carga |
| ESPERANDO SAG | (Exportación) en cola de inspección |
| APROBADO SAG / RECHAZADO SAG | Resultado de la inspección |
| LISTO | Listo para salir |
| DESPACHADO | Salió de la planta (fin del ciclo) |
| AVERIADO | Se averió y fue sustituido (no continúa) |

Definiciones de los KPIs de reportes: [../reportes/guia-kpis.md](../reportes/guia-kpis.md).
