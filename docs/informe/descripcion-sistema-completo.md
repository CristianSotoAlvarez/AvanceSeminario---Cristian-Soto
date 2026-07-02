# DispatchTrack — Descripción completa del sistema

> **Propósito.** Documento maestro y autocontenido que describe **la totalidad** del sistema DispatchTrack: su arquitectura, modelo de datos, roles, y **todas** sus funcionalidades —tanto las preexistentes como las desarrolladas en la etapa más reciente—. Está pensado como insumo integral para redactar el informe final de seminario de título (capítulos de marco, arquitectura, desarrollo y resultados). Cada funcionalidad indica con una etiqueta si es **[BASE]** (parte del sistema previo) o **[ETAPA 2026]** (incorporada en la iteración más reciente).

**Fecha:** 13 de junio de 2026.

---

## 1. Presentación del sistema

**DispatchTrack** ("Justo A Tiempo") es una aplicación web para la **trazabilidad, monitoreo y medición de rendimiento del área de despacho** de una planta de producción de alimentos, inspirada en el caso de Agrosuper S.A. El sistema acompaña dos flujos paralelos y entrelazados:

- **El flujo del camión:** desde que se programa su llegada hasta que es despachado, pasando por portería, asignación de andén, carga y —en el caso de exportación— túnel de frío e inspección sanitaria (SAG).
- **El flujo del pallet:** desde que un pickinero lo arma con los productos solicitados, hasta que un cargador lo sube al camión.

El sistema registra, en cada paso, **quién** ejecutó la acción, **cuándo**, y **qué incidencias** ocurrieron, alimentando un panel de indicadores que permite a la jefatura de logística tomar decisiones operativas basadas en datos.

**Objetivos que persigue el sistema:**
- Dar visibilidad en tiempo real del estado de cada camión y andén.
- Garantizar la trazabilidad de responsables y tiempos (relevante para protocolos de cadena de frío y auditoría sanitaria).
- Medir el cumplimiento del servicio y la productividad operativa.
- Gestionar las excepciones (atrasos, averías, fallas de infraestructura) de forma estructurada.

---

## 2. Arquitectura técnica

- **Patrón general:** monorepo gestionado con **Turborepo**, con aplicaciones y paquetes compartidos.
- **Backend (API):**
  - Framework **NestJS** (Node.js + TypeScript), organizado en módulos por dominio.
  - **Prisma ORM** sobre **PostgreSQL** como base de datos relacional.
  - Autenticación **JWT de doble token** (access token de corta vida + refresh token), con estrategia Passport.
  - Control de acceso por roles mediante *guards* y decoradores.
  - **WebSockets** (gateway de eventos) para actualización en tiempo real de las pantallas operativas.
  - **Redis** para coordinación entre instancias.
  - Documentación de API con **Swagger/OpenAPI**.
  - Seguridad: Helmet, rate limiting (throttler), validación de entrada con `class-validator`.
- **Frontend (Web):**
  - **Next.js 15** (App Router) con **React 19** y **TypeScript**.
  - **Tailwind CSS v4** para estilos; **Motion** para animaciones; **Recharts** para gráficos.
  - Lectura de códigos QR con la cámara (html5-qrcode) y generación de QR (qrcode).
  - Organización de rutas por *grupos* según contexto de uso: `(auth)` (login), `(platform)` (gestión), `(operativo)` (operarios), `(sag)` (inspección), además de rutas públicas (`p/`, `qr/`, `imprimir/`).
- **Paquetes compartidos:** tipos de dominio (`@dispatch-track/types`), componentes de interfaz (`@dispatch-track/ui`) y utilidades.

---

## 3. Modelo de datos

El dominio se compone de **16 entidades** y **9 enumeraciones**.

### 3.1 Enumeraciones

| Enumeración | Valores | Uso |
|---|---|---|
| `RolUsuario` | COORDINADOR_TRANSPORTE, COORDINADOR, PICKINERO, CARGADOR, SUPERVISOR, OPERADOR_TUNEL, JEFE_DESPACHO, SAG, **PORTERO** | Rol de cada usuario (PORTERO es **[ETAPA 2026]**) |
| `TipoEdificio` | AVES, CERDO, FRIGORIFICO | Puntos de expedición de la planta |
| `EstadoCamion` | ESPERADO, EN_PORTERIA, ASIGNADO, EN_CARGA, EN_TUNEL_FRIO, ESPERANDO_SAG, APROBADO_SAG, RECHAZADO_SAG, LISTO, DESPACHADO, **AVERIADO** | Ciclo de vida del camión (AVERIADO es **[ETAPA 2026]**) |
| `TipoCamion` | NACIONAL, EXPORTACION, INTERPLANTA | Tipo de destino |
| `EstadoInspeccion` | PENDIENTE, APROBADO, RECHAZADO | Resultado de inspección SAG |
| `EstadoPallet` | EN_ARMADO, ARMADO, CARGADO, VERIFICADO | Ciclo de vida del pallet |
| `EstadoParada` | PENDIENTE, EN_PROCESO, COMPLETADO | Estado de cada parada de expedición |
| `CausaJustificacion` | FALLA_ANDEN, FALLA_MECANICA, FALTA_PERSONAL, FALTA_PRODUCTO, VOLUMEN_EXCESIVO, PROBLEMA_CALIDAD, OTRO | Causa de un atraso justificado |
| `TipoIncidente` / `AccionIncidente` **[ETAPA 2026]** | AVERIA, FALTA_PRODUCTO, CAMBIO_ANDEN, REPROGRAMACION / ESPERAR_REPARACION, SUSTITUIR, … | Clasificación de incidentes operativos |

### 3.2 Entidades principales

| Entidad | Descripción |
|---|---|
| `Usuario` | Persona del sistema con un rol. Incluye el atributo **`polivalente`** **[ETAPA 2026]**. |
| `Edificio` | Punto de expedición (Aves, Cerdo, Frigorífico). |
| `Anden` | Posición de carga dentro de un edificio. Incluye estado de ocupación y, **[ETAPA 2026]**, de fuera de servicio. |
| `Cliente` | Destinatario nacional, interplanta o exportador. |
| `Pedido` | Pedido de un cliente, con total de pallets/bultos y fecha de entrega. |
| `Camion` | Unidad de transporte con su ciclo de estados, horarios planificados/reales y, **[ETAPA 2026]**, campos de reparación/sustitución. |
| `ParadaExpedicion` | Cada parada que un camión hace en un edificio para cargar. |
| `Entrega` | Agrupa los pallets que se cargan en una parada específica. |
| `EntregaItem` | Producto y cantidad **solicitada** en una entrega. |
| `Pallet` | Unidad física armada; registra pickinero, cargador, tiempos y estado. |
| `ProductoPallet` | Producto y cantidad **efectivamente cargada** en un pallet. |
| `Producto` | Catálogo interno (SKU, nombre, unidad, peso). |
| `InspeccionSAG` | Resultado de la inspección sanitaria de un camión de exportación. |
| `EventoCamion` | **Registro inmutable (append-only)** de cada cambio de estado del camión: la columna vertebral de la trazabilidad. |
| `EventoTunel` | Registro de temperatura en el túnel de frío. |
| `IncidenteCamion` **[ETAPA 2026]** | Registro de incidentes operativos (avería, etc.). |
| `JustificacionAtraso` | Causa registrada para un atraso de una parada. |
| `Atraso` | Registro de atraso atribuido a un edificio. |
| `AuditLog` | Bitácora de auditoría de acciones sobre entidades. |

---

## 4. Roles y control de acceso

El sistema define **9 roles**, cada uno con una pantalla principal y un conjunto acotado de permisos.

| Rol | Función principal | Pantalla inicial |
|---|---|---|
| **JEFE_DESPACHO** | Administrador. Acceso total + configuración y gestión de usuarios. | Dashboard |
| **COORDINADOR_TRANSPORTE** | Programa los camiones del día; gestiona clientes y productos. | Dashboard |
| **COORDINADOR** | Mueve el flujo: asigna andenes, marca listo, despacha, justifica atrasos. | Dashboard |
| **SUPERVISOR** | Visión transversal; puede operar cualquier pantalla y resolver incidentes. | Dashboard |
| **PICKINERO** | Arma los pallets con los productos solicitados. | Picking |
| **CARGADOR** | Carga los pallets armados al camión. | Carga |
| **OPERADOR_TUNEL** | Valida la temperatura de exportación en el túnel de frío. | Túnel |
| **SAG** | Inspecciona y aprueba/rechaza camiones de exportación. | Exportaciones |
| **PORTERO** **[ETAPA 2026]** | Registra la llegada de camiones a la planta. | Portería |

**Atributo de polivalencia [ETAPA 2026]:** un usuario `PICKINERO` o `CARGADOR` puede marcarse como *polivalente*, habilitándolo para ejercer ambas funciones, sin perder el registro separado de quién armó y quién cargó cada pallet.

La matriz de permisos detallada (pantalla × rol) está en `docs/manual/mapa-funcional.md`.

---

## 5. Funcionalidades del sistema

Esta sección describe **todas** las capacidades del sistema, agrupadas por área. La etiqueta indica si la funcionalidad es parte del sistema base o se incorporó en la etapa reciente.

### 5.1 Programación de camiones **[BASE]**
El Coordinador de Transporte crea ("programa") los camiones esperados del día, indicando patente, tipo (nacional/exportación/interplanta), cliente, hora de llegada planificada y las **paradas por edificio** con los productos solicitados (que constituyen los `EntregaItem`). El camión nace en estado `ESPERADO`. Se genera automáticamente un número de transporte según el tipo.

### 5.2 Registro de llegada / Portería **[ETAPA 2026]**
Cuando el camión llega físicamente, se registra su llegada (transición `ESPERADO → EN_PORTERIA`) por dos vías:
- **QR público sin login:** el portero escanea con la cámara nativa el QR de la hoja de ruta del camión, lo que abre una página pública con sus datos y un botón de confirmación.
- **Pantalla autenticada:** el rol `PORTERO` accede a la lista de camiones del día y confirma la llegada con un botón.
Esta área reemplaza un registro que antes se hacía manualmente desde la gestión.

### 5.3 Gestión de andenes **[BASE]** + fuera de servicio **[ETAPA 2026]**
La pantalla de andenes muestra, agrupados por edificio, todos los andenes con su estado (libre/ocupado) y el camión que los ocupa. Permite:
- **[BASE]** Asignar un andén a un camión en portería (transición a `ASIGNADO`), filtrando por el edificio de la próxima parada.
- **[BASE]** Avanzar estados del camión (marcar listo, despachar) desde el panel del andén.
- **[ETAPA 2026]** Marcar un andén como **fuera de servicio** (con motivo) y reactivarlo. Mientras está fuera de servicio, el sistema **bloquea** que se le asignen camiones. Un andén ocupado no puede marcarse fuera de servicio.

### 5.4 Ciclo de estados del camión (máquina de estados) **[BASE]**
El sistema implementa una **máquina de estados** que valida cada transición según el tipo de camión:
- **Nacional / Interplanta:** `ESPERADO → EN_PORTERIA → ASIGNADO → EN_CARGA → LISTO → DESPACHADO`.
- **Exportación:** agrega `EN_TUNEL_FRIO → ESPERANDO_SAG → (APROBADO_SAG | RECHAZADO_SAG)` antes de `LISTO`. Un rechazo SAG puede re-enviarse a inspección.
Cada transición genera un `EventoCamion` inmutable con marca de tiempo y responsable. **[ETAPA 2026]** se agregó el estado terminal `AVERIADO`.

### 5.5 Picking — armado de pallets **[BASE]**
El pickinero ve los pallets en estado `EN_ARMADO` agrupados por edificio. Abre un pallet, le agrega productos con sus cantidades, y lo cierra (transición a `ARMADO`). El sistema mide el **tiempo de armado** de cada pallet. Los pallets se crean inicialmente desde el detalle del camión (sección de entregas). **[ETAPA 2026]** el control de acceso se endureció: solo el pickinero (o un cargador polivalente) puede armar.

### 5.6 Carga de pallets **[BASE]**
El cargador ve los pallets `ARMADO` agrupados por camión y los marca como `CARGADO` al subirlos. El sistema registra **quién** cargó cada pallet. **[ETAPA 2026]** el control de acceso se endureció: solo el cargador (o un pickinero polivalente) puede cargar.

### 5.7 Túnel de frío **[BASE]**
Para camiones de exportación, el operador de túnel registra que la carga alcanzó la temperatura objetivo (−18 °C), lo que habilita el paso a inspección SAG. Se registra la temperatura en `EventoTunel`.

### 5.8 Inspección SAG **[BASE]**
El inspector SAG ve la cola de camiones de exportación esperando inspección y los **aprueba** o **rechaza** (con observaciones). Un camión rechazado puede corregirse y reenviarse a inspección. El resultado queda en `InspeccionSAG`.

### 5.9 Despacho **[BASE]**
Cuando el camión está listo (y, para exportación, aprobado por SAG), se marca `LISTO` y luego `DESPACHADO`, liberando el andén y cerrando el ciclo.

### 5.10 Gestión de pallets y verificación **[BASE]**
Cada pallet tiene un detalle con sus productos, su estado y sus responsables. Los roles de gestión pueden **verificar** un pallet (`CARGADO → VERIFICADO`) como control de calidad final.

### 5.11 Entregas y productos de entrega **[BASE]**
Cada parada genera una entrega que agrupa pallets y lista los productos solicitados (`EntregaItem`). El sistema compara lo solicitado con lo efectivamente cargado (`ProductoPallet`), base del cálculo de cumplimiento.

### 5.12 Justificación de atrasos **[BASE]**
Desde el detalle del camión, los roles de gestión pueden justificar el atraso de una parada eligiendo una causa (falla de andén, falta de personal, falla mecánica, falta de producto, etc.) y opcionalmente excluir ese caso del cálculo de tiempos (cuando es un evento externo justificado).

### 5.13 Manejo de incidentes operativos **[ETAPA 2026]**
- **Avería de camión:** esperar reparación in situ, o sustituir por otro camión traspasando la carga y dejando el original como `AVERIADO` (con regla de re-inspección SAG para exportación).
- **Andén fuera de servicio:** ver 5.3.
- Modelo `IncidenteCamion` genérico, preparado para incidentes futuros (falta de producto, cambio de andén, reprogramación).

### 5.14 Reportes y KPIs **[BASE, rediseñado en ETAPA 2026]**
Panel de indicadores con rango de fechas configurable:
- **KPIs principales [ETAPA 2026]:** Cumplimiento de servicio, OTIF, % de atrasos, Tiempo de ciclo —cada uno con comparativo vs. período anterior y tooltip de glosario.
- **Widgets:** despachos por día, distribución por estado, inspecciones SAG, tiempo por edificio vs. presupuesto, mediana de presupuesto, **cumplimiento por tipo de cliente [ETAPA 2026]**, **productividad de operadores [ETAPA 2026]**, **incidentes operativos [ETAPA 2026]**, top causas de justificación.
- **Exportación:** CSV y PDF (con estilos de impresión limpios **[ETAPA 2026]**).
- Glosario canónico en `docs/reportes/guia-kpis.md`.

### 5.15 Gestión de clientes **[BASE]**
Alta, edición y baja de clientes (nacionales, interplanta y exportadores), con código interno, RUT (opcional para extranjeros) y país.

### 5.16 Gestión de productos **[BASE]**
Catálogo de productos (SKU, nombre, unidad, peso), con **importación por CSV** y asignación de productos a las entregas.

### 5.17 Gestión de usuarios **[BASE]**
El Jefe de Despacho crea, edita y desactiva usuarios y les asigna rol; el Coordinador puede consultarlos. **[ETAPA 2026]** se sumó el atributo de polivalencia.

### 5.18 Dashboard / Tablero **[BASE]**
Vista de resumen operativo en vivo para los roles de gestión.

### 5.19 Búsqueda global **[BASE]**
Buscador en el encabezado que encuentra camiones, clientes y pallets, con navegación directa al resultado.

### 5.20 Códigos QR **[BASE, ampliado en ETAPA 2026]**
- **[BASE]** Generación de QR firmados con HMAC para camión y pallet; lectura con cámara en las pantallas operativas; ruta interna que redirige al detalle.
- **[ETAPA 2026]** El QR del camión se reorientó al flujo público de portería.

### 5.21 Hoja de ruta imprimible **[BASE]**
Cada camión puede imprimir su hoja de ruta con el QR incorporado, para entregar al conductor.

### 5.22 Eventos en tiempo real **[BASE]**
Las pantallas operativas (andenes, picking, carga) se actualizan automáticamente vía WebSockets cuando cambia el estado de un camión o andén.

### 5.23 Auditoría **[BASE]**
Registro de acciones sobre entidades (`AuditLog`) para trazabilidad administrativa.

---

## 6. Aporte específico de la etapa reciente (resumen)

La iteración más reciente se concentró en cerrar las brechas del "camino no feliz" y robustecer la capa analítica y de roles. Las siete líneas de trabajo fueron:

1. **Rediseño de Reportes y KPIs** — indicadores accionables (Cumplimiento de servicio, OTIF) y glosario.
2. **Avería de camión** — manejo en vivo (reparación o sustitución con traspaso de carga).
3. **Portería por QR** — registro de llegada sin fricción + rol PORTERO.
4. **Polivalencia Pickinero/Cargador** — conciliación entre norma de trazabilidad y realidad operativa.
5. **Mejoras de UX** — navegación agrupada, glosarios, estados vacíos, impresión.
6. **Andén fuera de servicio** — marcar/reactivar con bloqueo de asignación.
7. **Datos sintéticos** — 90 días / 1.436 camiones para resultados.

El detalle técnico de cada una (problema, solución, decisiones, justificación, impacto) está en **`docs/informe/bitacora-cambios.md`**, documento complementario a éste.

---

## 7. Resultados con datos sintéticos

Para evidenciar las capacidades analíticas, se generó un conjunto de datos sintético realista (90 días, 1.436 camiones) con una curva de mejora gradual. Comparando los últimos 30 días contra los 30 previos, el sistema reporta:

| Indicador | Período anterior | Últimos 30 días | Variación |
|---|---|---|---|
| OTIF | 29,7 % | 65,5 % | +35,8 puntos |
| Cumplimiento de servicio | ~96,7 % | ~96,3 % | estable (alto) |
| Camiones con atraso | 295 | 64 | −78 % |
| Tiempo de ciclo promedio | 217 min | 200 min | −17 min |

> Estos valores son de **demostración / prueba de concepto** sobre datos sintéticos, no una medición empírica sobre datos reales de la empresa. Su función es ilustrar la coherencia de los indicadores y las capacidades analíticas de la herramienta; deben presentarse como tales en el informe.

---

## 8. Trabajo futuro

- Implementar los tipos de incidente restantes ya modelados (falta de producto, cambio de andén, reprogramación) con flujo en vivo.
- Detección automática de camiones atrasados en vivo (job periódico + notificación).
- Historial de fallas por andén (tiempo fuera de servicio acumulado).
- Reasignación masiva de camiones/paradas cuando un andén cae con trabajo planificado.
- Modelo formal de turnos para la productividad de operadores.

---

## 9. Documentos relacionados

| Documento | Contenido |
|---|---|
| `docs/informe/bitacora-cambios.md` | Detalle técnico de los cambios de la etapa reciente (problema/solución/decisiones por funcionalidad). |
| `docs/manual/README.md` | Índice de la documentación de usuario. |
| `docs/manual/manual-usuario.md` | Manual paso a paso por rol. |
| `docs/manual/mapa-funcional.md` | Qué se hace dónde + matriz de permisos por rol. |
| `docs/manual/guia-prueba-flujo.md` | Guía de prueba manual de extremo a extremo. |
| `docs/reportes/guia-kpis.md` | Glosario de cada KPI y gráfico de reportes. |
| `docs/superpowers/specs/` | Documentos de diseño formales de cada funcionalidad de la etapa reciente. |

> **Sugerencia de mapeo a capítulos de informe.** Secciones 1–2 → *Introducción / Marco teórico / Arquitectura*; Sección 3 → *Modelo de datos*; Sección 4 → *Actores del sistema*; Sección 5 → *Descripción funcional* (núcleo del capítulo de desarrollo); Sección 6 → *Aporte de esta etapa*; Sección 7 → *Resultados*; Sección 8 → *Conclusiones y trabajo futuro*.
