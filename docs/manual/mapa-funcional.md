# Mapa funcional de DispatchTrack

Referencia técnica de **qué se puede hacer en el sistema y desde dónde**. Para instrucciones paso a paso por rol, ver [manual-usuario.md](manual-usuario.md).

Última actualización: 2026-06-13.

---

## 1. Acceso y autenticación

| Acción | Dónde | Quién |
|---|---|---|
| Iniciar sesión | `/login` | Todos (con cuenta) |
| Confirmar llegada de camión por QR | `/p/{token}` (público, sin login) | Conductor / Portero |

Tras iniciar sesión, cada rol es redirigido a su pantalla principal:

| Rol | Pantalla inicial |
|---|---|
| JEFE_DESPACHO, COORDINADOR, COORDINADOR_TRANSPORTE, SUPERVISOR | `/dashboard` |
| PICKINERO | `/picking` |
| CARGADOR | `/carga` |
| OPERADOR_TUNEL | `/tunel` |
| SAG | `/exportaciones` |
| PORTERO | `/porteria` |

---

## 2. Flujo del camión (ciclo operativo completo)

El camión avanza por estados. Cada transición la ejecuta un rol distinto desde una pantalla distinta:

```
ESPERADO
   │  (Portería registra llegada)
   ▼
EN_PORTERIA
   │  (Coordinador/Jefe asigna andén)
   ▼
ASIGNADO
   │  (Cargador inicia la carga)
   ▼
EN_CARGA
   │
   ├─► NACIONAL / INTERPLANTA ──► LISTO ──► DESPACHADO
   │
   └─► EXPORTACIÓN:
          EN_TUNEL_FRIO  (Operador túnel valida -18°C)
              ▼
          ESPERANDO_SAG  (Inspector SAG revisa)
              ├─ APROBADO_SAG ──► LISTO ──► DESPACHADO
              └─ RECHAZADO_SAG ──► (re-inspección) ──► ESPERANDO_SAG
```

| Transición | Pantalla | Rol habilitado |
|---|---|---|
| ESPERADO → EN_PORTERIA | `/porteria` o QR `/p/{token}` | PORTERO (+ gestión) |
| EN_PORTERIA → ASIGNADO (asignar andén) | `/camiones/[id]` o `/andenes` | COORDINADOR, JEFE_DESPACHO, SUPERVISOR |
| ASIGNADO → EN_CARGA (iniciar carga) | `/carga` | CARGADOR, SUPERVISOR, JEFE_DESPACHO |
| EN_CARGA → (finalizar carga) | `/carga` | CARGADOR, SUPERVISOR, JEFE_DESPACHO |
| EN_TUNEL_FRIO → ESPERANDO_SAG (temperatura OK) | `/tunel` | OPERADOR_TUNEL (+ gestión) |
| ESPERANDO_SAG → APROBADO/RECHAZADO_SAG | `/exportaciones` o `/sag` | SAG, JEFE_DESPACHO |
| RECHAZADO_SAG → ESPERANDO_SAG (re-inspección) | `/exportaciones` | SAG, JEFE_DESPACHO, SUPERVISOR |
| APROBADO_SAG → LISTO | `/camiones/[id]` | COORDINADOR, JEFE_DESPACHO, SUPERVISOR |
| LISTO → DESPACHADO | `/camiones/[id]` o `/andenes` | COORDINADOR, JEFE_DESPACHO, SUPERVISOR |

---

## 3. Manejo de incidentes y excepciones

| Incidente | Dónde se reporta | Cómo | Quién |
|---|---|---|---|
| **Avería de camión** (esperar reparación o sustituir) | `/camiones/[id]` → botón **"Reportar avería"** | Modal con 2 acciones: *Esperar reparación in situ* o *Sustituir por otro camión* | JEFE_DESPACHO, COORDINADOR_TRANSPORTE, COORDINADOR, SUPERVISOR |
| **Marcar camión reparado** | `/camiones/[id]` → botón **"Marcar reparado"** (aparece si está en reparación) | Cierra la pausa | Mismos roles |
| **Atraso justificado** (falla de andén, falta de personal, falla mecánica, falta de producto, volumen excesivo, problema de calidad, otro) | `/camiones/[id]` → en cada parada, botón **"Justificar"** | Modal con causa + descripción; opción de excluir del cálculo de tiempos | JEFE_DESPACHO, SUPERVISOR, COORDINADOR |
| **Reordenar paradas** del camión | `/camiones/[id]` | Arrastrar/reordenar paradas pendientes | JEFE_DESPACHO, COORDINADOR, SUPERVISOR |
| **Andén fuera de servicio** (marcar / reactivar) | `/andenes` → click en el andén → panel lateral | Marcar con motivo obligatorio (solo si el andén está libre); botón "Reactivar" para volverlo operativo | JEFE_DESPACHO, COORDINADOR_TRANSPORTE, COORDINADOR, SUPERVISOR |

> **Avería de andén:** se marca desde `/andenes`. Al hacer click en un andén se abre el panel lateral con el botón **"Marcar fuera de servicio"** (pide un motivo). **Regla:** un andén ocupado no puede marcarse fuera de servicio — primero hay que reasignar el camión. Mientras está fuera de servicio, el sistema **bloquea** que se le asignen nuevos camiones. Para volverlo operativo, botón **"Reactivar"**. El estado es actual (sin historial de fallas; eso quedó como seguimiento futuro).

---

## 4. Picking y carga de pallets

| Acción | Pantalla | Rol |
|---|---|---|
| Ver pallets en armado | `/picking` | PICKINERO (o CARGADOR polivalente) |
| Crear / armar pallet, agregar productos | `/picking` → `/pallets/[id]` | PICKINERO (o CARGADOR polivalente) |
| Cerrar pallet (EN_ARMADO → ARMADO) | `/pallets/[id]` | PICKINERO (o CARGADOR polivalente) |
| Ver pallets listos para cargar | `/carga` | CARGADOR (o PICKINERO polivalente) |
| Marcar pallet cargado (ARMADO → CARGADO) | `/carga` | CARGADOR (o PICKINERO polivalente) |
| Verificar pallet (CARGADO → VERIFICADO) | `/pallets/[id]` | JEFE_DESPACHO, SUPERVISOR, COORDINADOR |
| Escanear QR de pallet | `/picking`, `/carga`, `/tunel` (scanner integrado) | Operadores |

**Regla de polivalencia:** un operador con el atributo `polivalente` puede ejercer ambas funciones. Un PICKINERO polivalente también ve `/carga`; un CARGADOR polivalente también ve `/picking`. Sin el atributo, cada rol solo accede a su pantalla. La trazabilidad se mantiene: el sistema registra siempre `pickineroId` (quién armó) y `cargadorId` (quién cargó) por separado.

---

## 5. Inspección SAG (solo exportación)

| Acción | Pantalla | Rol |
|---|---|---|
| Ver cola de camiones esperando inspección | `/exportaciones` (portal SAG) o `/sag` | SAG, JEFE_DESPACHO, SUPERVISOR |
| Aprobar inspección | `/exportaciones` / `/sag` | SAG, JEFE_DESPACHO |
| Rechazar inspección | `/exportaciones` / `/sag` | SAG, JEFE_DESPACHO |
| Reenviar a inspección | `/exportaciones` | SAG, JEFE_DESPACHO, SUPERVISOR |

---

## 6. Reportes y análisis

| Contenido | Pantalla | Rol |
|---|---|---|
| KPIs (Cumplimiento de servicio, OTIF, % atrasos, Tiempo de ciclo) con comparativo vs período anterior | `/reportes` | JEFE_DESPACHO, COORDINADOR_TRANSPORTE, COORDINADOR, SUPERVISOR |
| Despachos por día, distribución por estado, SAG, tiempo por edificio, productividad de operadores, cumplimiento por tipo, incidentes operativos, causas de justificación | `/reportes` | Mismos roles |
| Exportar a CSV | `/reportes` → botón **CSV** | Mismos roles |
| Exportar a PDF / Imprimir | `/reportes` → botón **PDF** | Mismos roles |
| Tablero operativo en vivo | `/dashboard` | Roles de gestión |

Glosario completo de cada KPI: [../reportes/guia-kpis.md](../reportes/guia-kpis.md).

---

## 7. Configuración y administración

| Acción | Pantalla | Rol |
|---|---|---|
| Programar/crear camión | (API `POST /camiones`) | COORDINADOR_TRANSPORTE |
| Gestionar clientes | `/configuracion/clientes` | JEFE_DESPACHO, COORDINADOR_TRANSPORTE |
| Gestionar productos (catálogo + importar CSV) | `/configuracion/productos` | JEFE_DESPACHO, COORDINADOR_TRANSPORTE, COORDINADOR |
| Configuración general | `/configuracion` | JEFE_DESPACHO |
| Gestionar usuarios | (API `/usuarios`) | JEFE_DESPACHO (crear/editar), COORDINADOR (ver) |
| Búsqueda global (camiones, clientes, pallets) | Barra superior (header) | Todos los roles de plataforma |

---

## 8. Códigos QR — resumen de flujos

| QR | Generado/visto en | Escaneado por | Ruta destino | Acción |
|---|---|---|---|---|
| **QR de camión (portería)** | Hoja de ruta impresa `/imprimir/camion/[id]`, o botón QR en `/camiones/[id]` | Conductor / Portero (cámara nativa) | `/p/{token}` (público) | Registrar llegada (EN_PORTERIA) sin login |
| **QR de camión (interno)** | Mismo QR | Operador interno autenticado | `/qr/{token}` | Redirige al detalle del camión |
| **QR de pallet** | Generado por API | Pickinero/Cargador/Operador túnel | scanner integrado en `/picking`, `/carga`, `/tunel` | Abrir el pallet escaneado |

> El QR del camión apunta a `/p/{token}` (flujo público de portería). La ruta `/qr/{token}` sigue disponible para uso interno autenticado.

---

## 9. Matriz de permisos por rol (resumen)

| Pantalla / Acción | JEFE_DESPACHO | COORD_TRANSP | COORDINADOR | SUPERVISOR | PICKINERO | CARGADOR | OP_TUNEL | SAG | PORTERO |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | | | | | |
| Camiones (ver/gestionar) | ✓ | ✓ | ✓ | ✓ | | | | | |
| Reportar avería de camión | ✓ | ✓ | ✓ | ✓ | | | | | |
| Justificar atraso | ✓ | | ✓ | ✓ | | | | | |
| Andenes (ver) | ✓ | ✓ | ✓ | ✓ | | | | | |
| Andén fuera de servicio | ✓ | ✓ | ✓ | ✓ | | | | | |
| Portería | ✓ | ✓ | ✓ | ✓ | | | | | ✓ |
| Picking | ✓¹ | | | ✓ | ✓ | ◐² | | | |
| Carga | ✓¹ | | | ✓ | ◐² | ✓ | | | |
| Túnel frío | ✓¹ | | | ✓ | | | ✓ | | |
| SAG / Exportaciones | ✓ | | | ✓ | | | | ✓ | |
| Reportes | ✓ | ✓ | ✓ | ✓ | | | | | |
| Programar camión | | ✓ | | | | | | | |
| Clientes | ✓ | ✓ | | | | | | | |
| Productos | ✓ | ✓ | ✓ | | | | | | |
| Configuración | ✓ | | | | | | | | |
| Gestionar usuarios | ✓ | | ver | | | | | | |

¹ Roles de gestión pueden operar las pantallas operativas para cubrir emergencias.
² ◐ = solo si el operador tiene el atributo **polivalente**.
