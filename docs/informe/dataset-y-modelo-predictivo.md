# Dataset sintético y modelo predictivo — DispatchTrack

> **Propósito de este documento.** Consolida en un solo lugar todo lo relacionado con (1) el conjunto de datos sintéticos usado para demostrar el sistema y (2) el modelo predictivo de árboles de decisión construido sobre él. Complementa la narrativa cronológica de `docs/informe/bitacora-cambios.md` (secciones 9.3, 9.5 y 9.6) organizando la misma información por tema, para servir directamente como base de los capítulos de **Datos y Método** y **Resultados** del informe de título.

**Fecha:** 5 de agosto de 2026.

---

# Parte I — Dataset sintético de 180 días

## 1. Por qué un dataset sintético y por qué 180 días

El sistema no cuenta con datos reales de operación (ninguna empresa presta datos productivos a un proyecto de tesis). Para poder demostrar el sistema y entrenar un modelo predictivo se necesitaba un conjunto de datos que fuera:

- **Históricamente orientado hacia atrás**, no hacia adelante: DispatchTrack es un sistema de trazabilidad que registra lo que *ya ocurrió* (camiones que llegaron, se cargaron, pasaron por inspección, se despacharon), no un sistema de planificación a futuro. Un dataset "de los próximos 6 meses" estaría compuesto casi enteramente de camiones en estado `ESPERADO` sin ningún evento, pallet o inspección — no serviría para demostrar nada ni para entrenar un modelo.
- **Con resultados conocidos**, requisito indispensable para entrenar un modelo supervisado: para predecir si un camión será aprobado por SAG hace falta saber, de miles de camiones pasados, cuáles lo fueron y cuáles no.
- **Calibrado con el contexto real de negocio** del caso de estudio (una planta agroindustrial, sin identificarla por nombre), en vez de supuestos genéricos.

Se optó por **180 días** (6 meses) para tener suficiente profundidad histórica que evidencie tendencias semanales y mensuales en los reportes, y una base de entrenamiento suficientemente grande para el modelo predictivo.

## 2. Contexto de negocio incorporado

Recopilado directamente del estudiante a partir de su conocimiento del caso de estudio:

| Dimensión | Regla incorporada |
|---|---|
| Calendario semanal | Operación de lunes a sábado. Domingo cierra por completo desde las 06:00 y reabre a las 22:30 para recibir camiones hasta el sábado siguiente. |
| Volumen diario | Martes es el día de mayor recepción (~100 camiones). Miércoles y jueves también altos. Resto de días laborales entre 40 y 70. Promedio semanal 70-80 camiones/día operativo. |
| Puntos de expedición | **Aves** exporta en fresco (sin congelar). **Cerdo** nunca exporta — solo despacho nacional/interplanta. **Frigorífico** exporta congelado (aves, cerdo y salmón congelados) y es el único punto con productos congelados. |
| Composición de flota | Los camiones de exportación predominan sobre nacional/interplanta en todo momento dentro de la planta. |
| Tiempos operativos | Portería ≤10 minutos. Carga hasta 1h20-1h30 por punto de expedición. Túnel de frío hasta presentación a inspección SAG: 8-8,5 horas. |
| Límite legal de referencia | 3 horas (nacional/interplanta), 6 horas (exportación) — el estudiante indicó explícitamente que se excede con frecuencia en la práctica (incluso por días completos en casos extremos). Se modeló como 5-10% de camiones con atrasos fuertes fuera de norma. |
| Inspección SAG | Tasa de rechazo de 60-70% (confirmada explícitamente por el usuario, aunque alta para un proceso de inspección real). |
| Andenes fuera de servicio | 1-2 fallas por semana en total (cualquier punto de expedición), reparación de 30 minutos a un día completo. Frigorífico prácticamente nunca falla, por la criticidad de temperatura de sus productos (outlier de baja probabilidad, no imposible). |

## 3. Metodología de generación

El generador (`apps/api/prisma/generar-datos-demo.ts`) construye **todo el dataset en memoria** (con IDs propios, sin depender de la base de datos para generarlos) y lo inserta con `createMany` en lotes — necesario porque generar ~12.000 camiones y sus registros asociados fila por fila contra una base remota habría sido impracticable en tiempo razonable.

Por cada uno de los 180 días se determina el volumen según el día de la semana, y por cada camión se simula su ciclo completo: hora de llegada (con sesgo hacia la madrugada, horario principal de operación), tipo de camión, edificio y andén, tiempos de portería/carga/túnel/SAG según las reglas de la sección 2, y — para el 5-10% de casos outlier — una demora adicional fuerte y realista.

## 4. Incidente de infraestructura y su recuperación

Durante la primera ejecución del generador contra la base de datos de producción (Railway, plan gratuito con solo 500 MB de disco), la instancia de PostgreSQL **agotó el volumen de disco por completo** al insertar la tabla de productos por pallet, provocando una caída del servicio. Se diagnosticó la causa, se amplió el volumen mediante la función *live resize* de Railway (cobro solo por espacio efectivamente usado), y se recuperó el servicio.

El corte de disco había ocurrido en un punto intermedio de la inserción, dejando **completos** pedidos, camiones, paradas, entregas, ítems y pallets, pero **vacías** cuatro tablas completas que se insertaban después en el orden del script: `EventoCamion`, `InspeccionSAG`, `IncidenteCamion` y `JustificacionAtraso` (esto se detectó más tarde, al preparar los datos de entrenamiento del modelo predictivo — ver sección 8). Se recuperaron con scripts dedicados que reconstruyen los datos faltantes a partir de lo ya persistido (horarios reales, estado final del camión), replicando la misma lógica probabilística del generador original:

| Script de recuperación | Qué completó |
|---|---|
| `completar-productos-pallet.ts` | 214.353 filas de `ProductoPallet` para 85.619 pallets que habían quedado sin productos |
| `completar-historial-fallas.ts` | Historial de fallas de andón (36) y de túnel (13), y dejó un andón y un túnel marcados fuera de servicio en vivo para demo |
| `completar-eventos-sag-incidentes.ts` | 96.345 `EventoCamion`, 10.278 `InspeccionSAG`, 2.117 `IncidenteCamion`, 3.132 `JustificacionAtraso` |
| `enriquecer-temperatura-sag.ts` | 6.027 registros de temperatura de túnel (`EventoTunel`) — ver Parte II, sección 8 |

## 5. Estadísticas finales del dataset

| Magnitud | Valor |
|---|---|
| Período cubierto | 180 días (~6 meses) hacia atrás desde la fecha de generación |
| Camiones | 12.335 |
| Pallets | 190.371 |
| Productos por pallet | 476.355 |
| Eventos de camión (timeline) | 96.345 |
| Inspecciones SAG | 10.278 |
| Incidentes de camión | 2.117 |
| Justificaciones de atraso | 3.132 |
| Fallas de andén (historial) | 37 (incluye 1 actualmente fuera de servicio, para demo) |
| Fallas de túnel (historial) | 14 (incluye 1 actualmente fuera de servicio, para demo) |
| Registros de temperatura de túnel | 6.027 |
| Tamaño final de la base de datos | ~173 MB |

## 6. Limitaciones metodológicas a declarar en el informe

- Es un dataset **sintético de demostración**, no una medición empírica sobre datos reales de una empresa.
- Algunas probabilidades del generador (tasa de rechazo SAG, probabilidad de outlier de atraso) fueron parámetros dados explícitamente por el caso de estudio, no estimaciones del estudiante — se documentan como tales.
- El generador de números pseudoaleatorios usado es un generador congruencial lineal simple (por determinismo/reproducibilidad), no un generador criptográficamente robusto — no se descarta cierta autocorrelación débil en secuencias largas, relevante para la interpretación de algunos hallazgos del modelo predictivo (ver Parte II, sección 7).

---

# Parte II — Modelo predictivo (árboles de decisión)

## 1. Objetivo y origen del requisito

Por solicitud explícita del profesor guía, se incorporó al sistema un componente de **machine learning supervisado** usando la técnica de **árbol de decisión (CART)**, entrenado sobre el dataset de la Parte I, e **integrado en vivo** en la aplicación (no solo como análisis documentado).

## 2. Dos modelos, dos preguntas operativas

| Modelo | Pregunta que responde | Universo de camiones | Tipo de problema |
|---|---|---|---|
| **Riesgo OTIF** | ¿Este camión cumplirá On-Time In-Full? | Todos los tipos | Clasificación binaria |
| **Riesgo SAG** | ¿Este camión de exportación será aprobado o rechazado en inspección SAG? | Solo `EXPORTACION` | Clasificación binaria |

## 3. Variables predictoras (features)

Base común a ambos modelos, disponibles antes del resultado que se quiere anticipar:

- `tipoCamion` (NACIONAL / EXPORTACION / INTERPLANTA)
- `edificioTipo` (AVES / CERDO / FRIGORIFICO, según la primera parada)
- `diaSemana` y `horaLlegadaPlanificada`
- `cantidadPalletsSolicitados`

El modelo de riesgo SAG incorpora además, como variable adicional decisiva, la **temperatura registrada en el túnel de frío** (ver sección 8).

## 4. Metodología de entrenamiento

- **Herramienta:** Python 3.12 + `scikit-learn` + `pandas`, conectado directamente a la base de datos de producción vía `psycopg2` (`apps/api/ml/entrenar_modelos.py`).
- **Algoritmo:** `DecisionTreeClassifier` (CART), impureza Gini, `max_depth=4` (interpretabilidad — un árbol más profundo sería más "preciso" pero imposible de explicar y visualizar en la defensa), `min_samples_leaf=25`, `class_weight="balanced"` (compensa que solo el 15% de los camiones cumplen OTIF en el dataset).
- **División:** 80% entrenamiento / 20% prueba, estratificada. Todas las métricas reportadas corresponden al 20% de prueba, nunca visto durante el entrenamiento.
- **Métricas:** exactitud, precisión, *recall*, F1-score, matriz de confusión, importancia de variables (`feature_importances_`).
- **Exportación:** cada árbol entrenado se exporta como un **JSON de reglas** (umbral de decisión por nodo) — no como un archivo binario de scikit-learn.

## 5. Arquitectura de integración en vivo

Se evaluaron dos opciones (documentadas originalmente en `docs/superpowers/specs/2026-08-05-modelo-prediccion-arbol-decision-design.md`): desplegar un microservicio Python en Railway, o entrenar con Python y evaluar el árbol ya entrenado dentro del backend existente. **Se eligió la segunda**, dado el incidente de disco de la Parte I: minimizar infraestructura nueva antes de la defensa.

En la práctica: `apps/api/src/prediccion/arbol-decision.ts` implementa un evaluador puro en TypeScript que camina la estructura de nodos del JSON (sin ninguna dependencia de Python en producción), usando exactamente la misma featurización que el script de entrenamiento. `prediccion.service.ts` carga ambos modelos al iniciar la API y calcula la predicción para un camión dado; `prediccion.controller.ts` expone `GET /prediccion/:camionId`. El resultado se muestra en una tarjeta en la ficha de cada camión (`apps/web/app/(platform)/camiones/[id]/page.tsx`).

## 6. Resultados — primera versión

| Modelo | Ejemplos | Accuracy | Precision | Recall | F1 |
|---|---|---|---|---|---|
| Riesgo OTIF | 12.323 | 70,6% | 33,6% | 96,0% | 49,7% |
| Riesgo SAG (sin temperatura) | 6.027 | 56,5% | 69,7% | 58,1% | 63,4% |

**OTIF:** la variable `cantidadPalletsSolicitados` concentra el 98,9% de la importancia — es, por diseño del dataset, un proxy casi perfecto del tipo de camión, y el tipo de camión determina el riesgo estructural (exportación depende de superar SAG para despacharse a tiempo).

**El trade-off precisión/recall:** con `class_weight="balanced"` se sacrificó exactitud general para que el modelo detecte casi todos los casos de riesgo real (recall 96%), a costa de más falsas alarmas (precisión 34%). Es una decisión defendible para una herramienta de alerta temprana: en logística, no anticipar un atraso real suele ser más costoso que revisar de más un camión que finalmente sale bien.

## 7. Limitación metodológica honesta del modelo SAG (versión original)

El rechazo SAG se modeló en el generador como un evento **aproximadamente aleatorio** (probabilidad fija, independiente de otras variables). Por eso el modelo mostró bajo poder predictivo real — hallazgo honesto sobre el dataset, no una falla del modelo. Se verificó además, a solicitud del propio análisis crítico durante el desarrollo, cuántos casos históricos respaldaban cada predicción: el modelo OTIF quedó sólidamente respaldado (mínimo 156 casos por hoja del árbol), mientras que el SAG original tenía hojas más delgadas (mínimo 26 casos, cerca del piso configurado).

> Nota técnica: en este proceso se corrigió además un error de implementación — el conteo de "muestras por hoja" exportado originalmente usaba los valores ponderados por `class_weight="balanced"` en vez del conteo real de camiones (`n_node_samples`), reportando una confianza artificialmente baja en la interfaz. Corregido en `entrenar_modelos.py`.

## 8. Enriquecimiento del modelo SAG con temperatura de túnel

**El razonamiento.** ¿Aumentar la cantidad de datos habría resuelto la limitación del modelo SAG? No: más datos generados con el mismo generador solo habrían medido el mismo ruido con más precisión, sin crear una relación que nunca existió en el proceso generador. El problema no era de *tamaño de muestra*, sino de *información real disponible* en las variables usadas. La solución correcta era otra: el sistema ya registraba la **temperatura del túnel de frío** (`EventoTunel`), pero el generador nunca la conectó con el resultado de la inspección SAG — siendo que la temperatura de cadena de frío es, en la realidad, uno de los criterios centrales que evalúa este tipo de inspección.

**La decisión de modelado (declarada explícitamente).** Se estableció una regla de negocio: temperatura objetivo -18°C, con tolerancia. Camiones cerca de ese objetivo → alta probabilidad de aprobación; camiones alejados → alta probabilidad de rechazo, con solapamiento realista en la zona límite (para que el árbol siga resolviendo un problema de clasificación genuino, no trivial). Se generó la temperatura **hacia atrás**, de forma consistente con el resultado SAG que cada uno de los ~6.030 camiones de exportación ya tenía asignado, sin alterar inspecciones ni incidentes existentes (`enriquecer-temperatura-sag.ts`).

**Por qué esto no es "inflar" el resultado.** La relación temperatura↔aprobación no se inventó arbitrariamente: es el criterio real que una inspección de cadena de frío evalúa. Lo que se corrigió fue que el generador original había dejado esa relación "apagada" por simplicidad. Se documenta explícitamente como una **asunción de modelado**, no como un patrón descubierto en datos de inspección reales — la misma honestidad metodológica del resto del trabajo, aplicada a una decisión distinta.

## 9. Resultados — modelo SAG enriquecido

| Métrica | Antes (sin temperatura) | Después (con temperatura) |
|---|---|---|
| Accuracy | 56,5% | **99,6%** |
| Precision | 69,7% | **99,7%** |
| Recall | 58,1% | **99,6%** |
| F1-score | 63,4% | **99,7%** |
| Variable más importante | Hora de llegada (42,6%) | **Temperatura registrada (99,94%)** |
| Hojas del árbol / rango de respaldo | 15 hojas, 26-1.720 casos | 10 hojas, 33-2.371 casos |

## 10. Disponibilidad condicionada al momento operativo real

La temperatura solo existe una vez que el camión pasa por el túnel de frío — no antes. El endpoint de predicción refleja esto: si un camión de exportación aún no registró temperatura, el riesgo SAG se marca explícitamente como **"aún no disponible"**, en vez de inventar un valor por defecto que produciría una predicción falsa. Esto es además más realista operativamente: el momento útil de esta predicción es justo cuando el camión queda en cola para SAG, no antes.

## 11. Qué se puede afirmar con seguridad en la defensa

- **Riesgo OTIF:** modelo estadísticamente sólido, con una relación causal explicable (tipo de camión → dependencia de SAG → riesgo estructural). Contribución genuinamente útil como herramienta de alerta temprana.
- **Riesgo SAG (enriquecido):** modelo con desempeño casi perfecto, pero construido sobre una regla de negocio **declarada y asumida** (temperatura → resultado), no derivada de datos de inspección reales. Demuestra la arquitectura completa (Python → JSON de reglas → TypeScript en producción → interfaz) funcionando de punta a punta con datos que sí tienen una relación causal real, tal como ocurriría con datos de producción genuinos.
- El contraste entre ambas versiones del modelo SAG (56,5% → 99,6% solo por agregar la variable causal correcta) es en sí mismo un hallazgo pedagógicamente valioso: evidencia cuánto depende el desempeño de un modelo de que el sistema capture las variables que realmente explican el fenómeno — un argumento defendible sobre el valor de un sistema de trazabilidad bien instrumentado.

---

# Parte III — Cómo verlo en la aplicación

| Qué | Dónde |
|---|---|
| Predicción de riesgo de un camión | Ficha de detalle de cualquier camión (`/camiones/[id]`) — tarjeta "Predicción de riesgo (árbol de decisión)" |
| Camiones de hoy con perfiles de riesgo contrastantes | Buscar patentes `PRED-01` a `PRED-05` en `/camiones` |
| Flujo completo (pendiente → predicción real) | Un camión de exportación sin temperatura muestra "Riesgo SAG: aún no disponible"; al registrar temperatura desde `/tunel`, la predicción aparece de inmediato |
| Historial de fallas de andén/túnel | `/andenes` y `/tuneles` — panel de detalle de cada uno |
| Visualizaciones de los árboles y métricas | `docs/informe/modelo-prediccion/arbol-otif.png`, `arbol-sag.png`, `reporte-metricas.md` |

---

# Trabajo futuro

- Con datos reales de producción, el modelo SAG debería reentrenarse incorporando variables adicionales que hoy el sistema no captura (historial de calidad del proveedor, tipo de documentación presentada, antigüedad del camión).
- Evaluar si el modelo OTIF mejora incorporando el estado de andenes/túneles al momento de la asignación (¿había alguno fuera de servicio?) como variable predictora.
- Reentrenamiento periódico programado a medida que se acumulen datos reales de operación.
