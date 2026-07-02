# Documentación de usuario — DispatchTrack

Esta carpeta contiene la documentación funcional y los manuales de usuario del sistema.

## Documentos

| Documento | Para qué sirve |
|---|---|
| [mapa-funcional.md](mapa-funcional.md) | **Referencia técnica.** Qué se puede hacer en el sistema, desde qué pantalla, con qué endpoint y qué rol lo permite. Incluye el flujo completo del camión, manejo de incidentes, flujos de QR y la matriz de permisos por rol. |
| [manual-usuario.md](manual-usuario.md) | **Manual paso a paso por rol.** Instrucciones en lenguaje de usuario final para cada uno de los 10 roles, con sus cuentas de ejemplo y tareas concretas. |
| [guia-prueba-flujo.md](guia-prueba-flujo.md) | **Guía de prueba manual end-to-end.** Recorrido completo paso a paso (con casillas de verificación) para probar todo el sistema con tus propias manos: flujo nacional, exportación, incidentes, polivalencia y reportes. |
| [../reportes/guia-kpis.md](../reportes/guia-kpis.md) | Glosario de cada KPI y gráfico del módulo de reportes: qué mide, por qué importa y qué decisión apoya. |

## Acceso rápido

- **App local:** http://localhost:3000
- **Contraseña de todas las cuentas de prueba:** `clave123`

| Rol | Cuenta | Entra a |
|---|---|---|
| Jefe de Despacho | `jefe@dispatch.cl` | `/dashboard` |
| Coordinador de Transporte | `coord.transporte@dispatch.cl` | `/dashboard` |
| Coordinador | `coordinador@dispatch.cl` | `/dashboard` |
| Supervisor | `supervisor@dispatch.cl` | `/dashboard` |
| Pickinero | `pickinero@dispatch.cl` | `/picking` |
| Cargador | `cargador@dispatch.cl` | `/carga` |
| Operador Túnel | `tunel@dispatch.cl` | `/tunel` |
| Inspector SAG | `sag@dispatch.cl` | `/exportaciones` |
| Portería | `porteria@dispatch.cl` | `/porteria` |
| Pickinero polivalente | `tomas.pickinero@dispatch.cl` | `/picking` + `/carga` |
| Cargador polivalente | `camila.cargador@dispatch.cl` | `/carga` + `/picking` |

## Preguntas frecuentes

**¿Dónde reporto un camión averiado?**
En el detalle del camión (`/camiones/[id]`), botón **"Reportar avería"**. Lo pueden hacer Jefe de Despacho, Coordinadores y Supervisor. Ver [manual-usuario.md → Supervisor](manual-usuario.md#8-supervisor).

**¿Dónde reporto un andén averiado?**
En `/andenes`: hacé click en el andén y en el panel lateral tocá **"Marcar fuera de servicio"** (pide un motivo). El andén debe estar libre. Mientras esté fuera de servicio no se le pueden asignar camiones; usá **"Reactivar"** para volverlo operativo. Lo pueden hacer Jefe de Despacho, Coordinadores y Supervisor. Ver [mapa-funcional.md § 3](mapa-funcional.md#3-manejo-de-incidentes-y-excepciones).

**¿Dónde veo los resultados/KPIs?**
En `/reportes`. Ver [guia-kpis.md](../reportes/guia-kpis.md).
