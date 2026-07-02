# QR público para portería

**Fecha:** 2026-05-09
**Estado:** Aprobado para implementación
**Alcance:** automatizar el registro de llegada de camiones a planta. Dos caminos complementarios:

1. **Camino rápido (público)**: el conductor trae la hoja de ruta impresa con QR. Escanea con cámara nativa → URL pública `/p/{token}` → confirma llegada. Sin login.
2. **Camino respaldo (interno)**: si el conductor no trae la hoja, la tablet de portería tiene una pantalla `/porteria` con la lista de camiones del día y un botón "Confirmar llegada" por camión. Requiere cuenta compartida de portería.

## Problema

El registro de `EN_PORTERIA` hoy requiere abrir la plataforma con una cuenta y tocar un botón. En portería esto es lento y tener una cuenta dedicada genera fricción operativa. Se quiere automatizar este paso con QR.

## Solución

Cada camión ya tiene un QR con un token HMAC-firmado (`QrService`). El QR encodeará una URL pública nueva (`/p/{token}`) que abre una página sin autenticación. La página muestra los datos del camión y un botón grande **"Confirmar llegada"**. Al confirmar, el sistema cambia el estado de `ESPERADO` a `EN_PORTERIA` y registra `horaLlegadaReal`.

El portero usa la **cámara nativa** de su dispositivo (no nuestra app). Al escanear el QR, el sistema operativo abre el navegador en `/p/{token}` directamente.

## Cambios al modelo de datos

Nuevo rol en `RolUsuario`: `PORTERO`. Sin permisos sobre nada que no sea portería (no ve reportes, no crea camiones, no toca SAG).

Seed: nueva cuenta compartida `porteria@dispatch.cl` / `clave123` con rol `PORTERO`. La tablet de portería inicia sesión una vez y mantiene sesión persistente.

## Cambios al backend

Nuevo módulo `PorteriaModule` con dos controllers:

**Controller público** (sin `JwtAuthGuard`) — para el escaneo de QR del conductor:

- `GET /porteria/qr/:token` — valida token con HMAC vía `QrService.validarToken()`. Retorna info reducida del camión: `{ id, patente, numeroTransporte, tipo, cliente, horaLlegadaPlanificada, estado, andenAsignado? }`. Para tokens inválidos retorna 404.
- `POST /porteria/qr/:token/confirmar` — valida token, valida estado actual (`ESPERADO`), y registra la llegada:
  - `Camion.estado = EN_PORTERIA`, `horaLlegadaReal = now()`.
  - Crea `EventoCamion` con nota "Llegada registrada por portería (QR)" y `usuarioId = null` (sin usuario).
  - Emite evento del gateway para refrescar dashboards.

**Controller autenticado** (con `JwtAuthGuard` + `RolesGuard`, rol `PORTERO` o `JEFE_DESPACHO`/`SUPERVISOR`) — para la pantalla de portería:

- `GET /porteria/camiones-hoy` — lista los camiones planificados para hoy (`horaLlegadaPlanificada` entre 00:00 y 23:59 de hoy) ordenados por hora. Retorna: `{ id, patente, numeroTransporte, tipo, cliente, horaLlegadaPlanificada, horaLlegadaReal, estado }[]`.
- `POST /porteria/camion/:id/confirmar` — registra la llegada del camión por ID (alternativa al flujo QR): valida estado `ESPERADO`, cambia a `EN_PORTERIA`, registra evento con el `usuarioId` de la cuenta de portería autenticada.

**Casos de error con mensaje legible:**

- Token inválido → 404 `"QR no válido."`
- Camión ya en EN_PORTERIA o posterior → 409 `"Camión ya registrado en estado X a las HH:MM."`
- Camión `DESPACHADO` → 409 `"Este camión ya fue despachado."`
- Camión `AVERIADO` → 409 `"Camión averiado, contactar coordinación."`

`EventoCamion.usuarioId` es opcional, pero si fuera obligatorio se documenta como `null`. (Verificar en schema; si es required, ajustar.)

## Cambios al frontend

Nueva ruta pública **`apps/web/app/p/[token]/page.tsx`**, sin layout de plataforma. Vista responsiva, optimizada para móvil/tablet.

Flujo de UI:

1. Carga: spinner grande mientras llama a `GET /porteria/qr/:token`.
2. Error: pantalla con ícono y mensaje claro. Solo botón "Cerrar".
3. OK: card grande con patente y número de transporte (tipografía monoespaciada gigante), tipo coloreado, cliente, hora planificada vs actual con etiqueta "puntual / atrasado / temprano". Botón verde grande **"Confirmar llegada"**.
4. Confirmado: pantalla de éxito (✓ HH:MM) durante 3 segundos. Luego botón **"Listo"** que cierra (vuelve a la cámara nativa, lista para escanear el próximo).

Cambios adicionales:

- `apps/web/components/qr-camion.tsx`: cambiar la URL del QR de `/qr/${token}` a `/p/${token}`.
- `apps/web/app/imprimir/camion/[id]/page.tsx`: misma actualización.
- La ruta existente `/qr/[token]` (auth-required, redirige a detalle) **se mantiene** para QRs antiguos y para uso interno de managers que escanean para ir al detalle. Los QRs nuevos usan `/p/{token}`.

**Pantalla de portería (autenticada)**: `apps/web/app/(platform)/porteria/page.tsx`. Vista grande para tablet:

- Encabezado: "Portería — camiones de hoy".
- Buscador con autocompletado por patente.
- Lista de cards grandes con: patente, número de transporte, tipo (badge color), cliente, hora planificada, hora real (si ya llegó). Botón verde grande **"Confirmar llegada"** si el camión está en `ESPERADO`. Si ya llegó, muestra hora de llegada.
- La lista se actualiza automáticamente cada 30s.
- En el sidebar de la plataforma, el rol PORTERO solo ve la opción "Portería" (sin reportes, dashboard, etc.).

## Decisiones de seguridad

Acordado con el usuario: **opción A "cero fricción"**. Sin PIN, sin ventana temporal, sin login. Confiamos en que el QR está físicamente en posesión del conductor y que el portero confirma visualmente que el camión coincide con los datos antes de tocar el botón.

Riesgo aceptado: si la imagen del QR se filtra, alguien off-site podría marcar llegada falsamente. Mitigación natural: el cambio se ve inmediatamente en `/camiones` y reportes, y la patente debe coincidir con la del camión físico. Si esto se vuelve un problema operativo, se puede agregar luego ventana temporal o PIN sin romper nada (la ruta es nueva).

## Riesgos y consideraciones

- **`EventoCamion.usuarioId` obligatorio**: si lo es, el endpoint debe pasar un usuario "sistema" o cambiar el campo a opcional. Decidir al implementar.
- **Concurrencia**: dos escaneos simultáneos del mismo camión pueden llegar al mismo tiempo. Mitigación: validación dentro de transacción (estado actual = ESPERADO antes de mutar) — el segundo intento devuelve "ya registrado".
- **Camiones en multi-parada**: tras finalizar carga, vuelven a `EN_PORTERIA` (línea 312 de `camiones.service.ts`). El portero no debería interactuar con esos camiones (ya están dentro de planta), pero si escanea el QR el endpoint devuelve "ya registrado". Comportamiento aceptable.

## Seguimientos pendientes

- **QR para otras pantallas** (asignación de andén, despacho, marcar listo) — el patrón de página pública con token es reutilizable. Queda como próxima iteración.
- **Pickinero vs Cargador**: refactor de roles y UI. Independiente del QR.
- **Tablet de portería con scanner integrado**: si la cámara nativa no basta, agregar `/porteria` con `QrScanner` que lee y redirige automáticamente a `/p/{token}`.
