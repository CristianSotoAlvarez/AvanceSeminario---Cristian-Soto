# Diseño: Modelo predictivo basado en árbol de decisión

**Fecha:** 5 de agosto de 2026
**Origen del requisito:** solicitado explícitamente por el profesor guía, en el marco de la defensa de avance del proyecto de título.
**Estado:** diseño aprobado para documentar; **implementación aún no iniciada**.

---

## 1. Objetivo

Incorporar al sistema DispatchTrack un componente de **machine learning supervisado**, usando la técnica de **árbol de decisión (CART)**, entrenado sobre el conjunto de datos sintéticos de 180 días generado en la Etapa 2 (ver `docs/informe/bitacora-cambios.md`, sección 9.3). El modelo debe quedar **integrado en vivo** en la aplicación, no solo como un análisis documentado.

## 2. Variables objetivo (dos modelos independientes)

Se entrenan **dos árboles de decisión separados**, cada uno resolviendo una pregunta operativa distinta:

| Modelo | Pregunta que responde | Tipo de problema | Universo de camiones |
|---|---|---|---|
| **Riesgo SAG** | ¿Este camión de exportación será aprobado o rechazado en la inspección SAG? | Clasificación binaria | Solo `EXPORTACION` |
| **Riesgo OTIF** | ¿Este camión cumplirá On-Time In-Full (a tiempo y completo)? | Clasificación binaria | Todos los tipos |

## 3. Variables predictoras (features)

Comunes a ambos modelos, disponibles en el momento de hacer la predicción (es decir, conocidas *antes* del resultado que se quiere anticipar):

- `tipoCamion` (NACIONAL / EXPORTACION / INTERPLANTA) — categórica
- `edificioTipo` (AVES / CERDO / FRIGORIFICO, según la primera parada) — categórica
- `diaSemana` (lunes a sábado) — categórica u ordinal
- `horaLlegadaPlanificada` (hora del día, 0-23) — numérica
- `cantidadPalletsSolicitados` — numérica

Para el modelo de riesgo SAG se evaluará además si aporta señal la variable `cantidadPalletsSolicitados` como proxy de volumen de carga, aunque no se espera que sea determinante (ver limitación en sección 6).

## 4. Fuente de datos y preparación

- **Fuente:** base de datos de producción (PostgreSQL en Railway), tabla `camiones` con sus relaciones (`paradas`, `inspeccionesSAG`, `entregas`).
- **Extracción:** un script en Python se conecta a la base (via `psycopg2` o exportando un CSV intermedio desde Prisma) y arma el dataset de entrenamiento con las features de la sección 3 más la etiqueta correspondiente a cada modelo.
- **Etiquetas:**
  - Riesgo SAG: `1` si la inspección final fue `APROBADO`, `0` si `RECHAZADO` (usando el resultado de la última inspección registrada para ese camión).
  - Riesgo OTIF: `1` si el camión fue despachado a tiempo (`horaSalidaReal <= horaSalidaPlanificada`) **y** con el 100% de lo solicitado cargado; `0` en cualquier otro caso — mismo criterio que ya usa `reportes.service.ts` para el KPI OTIF, para mantener coherencia entre lo que reporta el sistema y lo que predice el modelo.
- **División:** 80% entrenamiento / 20% prueba, con partición aleatoria estratificada (para mantener la proporción de clases en ambos conjuntos).

## 5. Técnica y herramienta

- **Algoritmo:** árbol de decisión CART (`sklearn.tree.DecisionTreeClassifier`), con impureza Gini.
- **Herramienta:** Python 3.12 + `scikit-learn` + `pandas` (ya instalado en el entorno de desarrollo para este propósito).
- **Profundidad máxima:** se limitará (ej. `max_depth=4` o `5`) para que el árbol resultante sea interpretable y visualizable en el informe — un argumento de peso a favor de esta técnica sobre modelos de caja negra (redes neuronales, ensambles), ya que el objetivo académico incluye poder **explicar** qué variables pesan en cada decisión, no solo maximizar exactitud.
- **Métricas de evaluación** (sobre el conjunto de prueba, no el de entrenamiento): exactitud (*accuracy*), precisión, *recall*, F1-score y matriz de confusión. Se reportarán ambos modelos por separado.
- **Entregable visual:** representación gráfica del árbol (`sklearn.tree.plot_tree` o exportación a Graphviz) para incluir en el informe.

## 6. Limitación metodológica conocida (a documentar honestamente en el informe)

El generador de datos sintéticos (Etapa 2) modela el **rechazo SAG como un evento aproximadamente aleatorio** (probabilidad fija de 60-70%, independiente de cualquier otra variable del sistema, tal como lo describió el caso de estudio). Esto significa que es **esperable y correcto** que el árbol de riesgo SAG muestre poca o ninguna capacidad predictiva más allá de la clase mayoritaria — no es una falla del modelo ni de la implementación, sino un reflejo fiel de que el sistema actual no captura las variables que en la realidad determinan un rechazo (temperatura real del producto, calidad, documentación, etc.).

En cambio, el árbol de riesgo OTIF **sí debería mostrar una relación real y explicable**: los camiones de exportación que terminan rechazados en SAG nunca se despachan a tiempo (por construcción del flujo), por lo que se espera que `tipoCamion` emerja como la variable de mayor importancia (`feature_importance`) para explicar el incumplimiento OTIF. Este contraste entre ambos modelos es en sí mismo un hallazgo interesante para la discusión del informe: evidencia qué tan bien el sistema actual captura las causas de cada fenómeno.

## 7. Arquitectura de integración en vivo

Dado que la decisión es entrenar e inferir con Python (no reimplementar el árbol en TypeScript), y que el stack de producción actual es 100% Node.js/TypeScript (NestJS + Next.js) sin ningún componente Python desplegado, se evaluarán las siguientes opciones para la integración en vivo:

| Opción | Descripción | Ventaja | Riesgo/costo |
|---|---|---|---|
| **A. Microservicio Python (FastAPI)** | Un servicio nuevo y liviano en Railway que carga el modelo entrenado (`joblib`) y expone un endpoint HTTP de predicción; la API de NestJS lo consulta. | Arquitectura más "correcta" y defendible como proyecto de ML real; separación de responsabilidades clara. | Nuevo servicio a desplegar y mantener en Railway — dado el incidente de disco de esta misma etapa, se evaluará cuidadosamente el consumo de recursos antes de desplegar. |
| **B. Exportar el árbol entrenado como reglas y evaluarlo en TypeScript** | Se entrena con Python/scikit-learn, pero la estructura final del árbol (umbrales y ramas) se exporta a un archivo y se evalúa con una función simple en el backend de NestJS. | Sin infraestructura nueva; evaluación instantánea, sin llamada de red adicional. | El entrenamiento sigue siendo con Python (cumple el requisito del profesor), pero la inferencia en producción no "corre" scikit-learn — a aclarar si esto satisface el requisito de "hecho en Python". |

**Recomendación pendiente de confirmar con el usuario:** dado el incidente de disco reciente, la opción B reduce el riesgo operativo de cara a la defensa, manteniendo igualmente a Python como la herramienta de entrenamiento y evaluación del modelo (que es donde ocurre el trabajo de ciencia de datos real). La opción A es más "pura" arquitectónicamente pero introduce una pieza de infraestructura nueva justo antes de una presentación importante.

## 8. Plan de trabajo (una vez se autorice implementar)

1. Instalar dependencias de Python (`scikit-learn`, `pandas`, `psycopg2-binary`, `matplotlib` o `graphviz`).
2. Script de extracción de datos desde la base de producción.
3. Entrenamiento de los dos árboles, con métricas y visualización.
4. Definir e implementar la arquitectura de integración (opción A o B, sección 7).
5. Exponer la predicción en la interfaz (ej. tarjeta de "predicción de riesgo" en la ficha del camión y/o en reportes).
6. Documentar resultados finales en `docs/informe/bitacora-cambios.md` (sección 9.5, actualmente marcada como "trabajo en curso").

---

> Este documento describe únicamente el diseño. No se ha escrito código de entrenamiento ni de integración; se ejecutará cuando el usuario lo autorice explícitamente.
