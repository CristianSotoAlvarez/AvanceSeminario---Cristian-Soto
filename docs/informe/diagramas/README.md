# Diagramas del sistema — DispatchTrack

Diagramas interactivos generados con [Archify](https://github.com/tt-a1i/archify) a partir del código real del repositorio (revisión `890556b`). Cada archivo `.html` es autocontenido: se abre directamente en el navegador, sin servidor ni dependencias.

## Los cuatro diagramas

| Archivo | Tipo | Qué explica |
|---|---|---|
| `arquitectura.html` | Arquitectura | Monorepo completo: Next.js, API NestJS, PostgreSQL, Redis/WebSocket, módulo de predicción y entrenamiento offline |
| `ciclo-camion.html` | Ciclo de vida | Máquina de estados del camión, tomada de `apps/api/src/camiones/maquina-estados.ts` |
| `flujo-operativo.html` | Flujo de trabajo | Recorrido end-to-end por rol, desde la programación hasta el despacho |
| `modelo-predictivo.html` | Flujo de datos | Pipeline de los árboles de decisión: del histórico al artefacto JSON y a la predicción en vivo |

## Cómo usarlos

Al abrir cualquiera de ellos en el navegador se puede:

- **Cambiar tema** claro/oscuro
- **Buscar y enfocar** un nodo concreto
- **Seguir una relación** (trazado) para aislar un camino
- **Recorrer vistas guiadas** — cada diagrama trae 3 capítulos temáticos ya preparados (por ejemplo "Camino principal", "Tiempo real", "Predicción")
- **Exportar** a PNG, JPEG, WebP o SVG para pegarlo en el informe

## Regenerar un diagrama

Las fuentes son los archivos `.json` junto a cada HTML. Para regenerar tras editar una fuente:

```bash
cd ~/.claude/skills/archify
node bin/archify.mjs deliver architecture <ruta>/arquitectura.architecture.json <ruta>/arquitectura.html \
  --quality showcase --repo-root <raíz del repo>
```

Cambiando `architecture` por `lifecycle`, `workflow` o `dataflow` según corresponda. El flag `--repo-root` solo lo necesita el de arquitectura, que referencia archivos del repositorio como evidencia.

## Estado de verificación

Los cuatro pasan las 9 comprobaciones de artefacto en calidad *showcase*, sin advertencias.

En la verificación automatizada de navegador (`visual-check`), a 1440×900:

- `arquitectura.html` y `modelo-predictivo.html` — contenidos por completo en pantalla.
- `ciclo-camion.html` y `flujo-operativo.html` — requieren desplazamiento vertical (~390px). El contenido es correcto y legible; simplemente son diagramas altos (3 bandas y 5 carriles respectivamente). En pantallas de 2048×1320 el exceso baja a ~127px.

## Nota sobre el ciclo de vida

El diagrama `ciclo-camion` representa el estado `APROBADO_SAG` como la transición «aprobado por SAG» en vez de una caja propia, por restricciones de la grilla. El código sí lo modela como estado intermedio entre la aprobación y `LISTO`; está anotado en el propio diagrama.
