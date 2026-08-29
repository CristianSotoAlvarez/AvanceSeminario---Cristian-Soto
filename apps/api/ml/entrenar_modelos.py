"""
Entrenamiento de dos árboles de decisión (CART) sobre el dataset sintético
de DispatchTrack, según el diseño documentado en
docs/superpowers/specs/2026-08-05-modelo-prediccion-arbol-decision-design.md

Modelo 1 — Riesgo SAG: predice si un camión de exportación será aprobado o
rechazado en la inspección SAG.
Modelo 2 — Riesgo OTIF: predice si un camión (cualquier tipo) cumplirá
On-Time In-Full.

Cada árbol se exporta como JSON de reglas (estructura de nodos con umbrales)
a apps/api/src/prediccion/modelos/, para ser evaluado en vivo por el backend
NestJS sin necesitar Python en producción. También se generan métricas,
matriz de confusión, importancia de variables y una visualización del árbol
para el informe.

Ejecutar con:  py apps/api/ml/entrenar_modelos.py
Requiere la variable de entorno DATABASE_URL (o se puede pasar inline).
"""
import os
import json
import sys
from pathlib import Path

import pandas as pd
import psycopg2
from sklearn.tree import DecisionTreeClassifier, export_text, plot_tree
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report,
)
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

RAIZ = Path(__file__).resolve().parents[3]  # raíz del repo
DIR_MODELOS = RAIZ / "apps" / "api" / "src" / "prediccion" / "modelos"
DIR_INFORME = RAIZ / "docs" / "informe" / "modelo-prediccion"
DIR_MODELOS.mkdir(parents=True, exist_ok=True)
DIR_INFORME.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("❌ Falta la variable de entorno DATABASE_URL", file=sys.stderr)
    sys.exit(1)

MAX_DEPTH = 4
MIN_SAMPLES_LEAF = 25
SEED = 20260805

# ─── Conexión y extracción ──────────────────────────────────────────────────

def conectar():
    return psycopg2.connect(DATABASE_URL)


def extraer_datos_otif(conn) -> pd.DataFrame:
    """Filas a nivel de línea de entrega, para calcular OTIF por camión igual
    que reportes.service.ts (calcularCumplimientoYOtif)."""
    sql = """
        SELECT
          c.id AS "camionId",
          c.tipo AS "tipoCamion",
          p."edificioTipo",
          EXTRACT(DOW FROM c."horaLlegadaPlanificada")::int AS "diaSemana",
          EXTRACT(HOUR FROM c."horaLlegadaPlanificada")::int AS "horaLlegada",
          p."cantidadPalletsSolicitados",
          CASE
            WHEN c."horaSalidaReal" IS NOT NULL AND c."horaSalidaPlanificada" IS NOT NULL
            THEN c."horaSalidaReal" <= c."horaSalidaPlanificada"
            ELSE NULL
          END AS "onTime",
          ei.id AS "itemId",
          ei."cantidadSolicitada",
          COALESCE((
            SELECT SUM(pp.cantidad)
            FROM pallets pl
            INNER JOIN productos_pallet pp ON pp."palletId" = pl.id
            WHERE pl."entregaId" = e.id AND pp."productoId" = ei."productoId"
          ), 0) AS "cantidadCargada"
        FROM camiones c
        INNER JOIN paradas_expedicion p ON p."camionId" = c.id AND p.orden = 1
        LEFT JOIN entregas e ON e."camionId" = c.id
        LEFT JOIN entrega_items ei ON ei."entregaId" = e.id
        WHERE c.estado != 'AVERIADO'
    """
    return pd.read_sql(sql, conn)


def construir_dataset_otif(lineas: pd.DataFrame) -> pd.DataFrame:
    lineas = lineas.copy()
    lineas["cantidadCargadaTope"] = lineas[["cantidadCargada", "cantidadSolicitada"]].min(axis=1)

    agrupado = lineas.groupby("camionId").agg(
        tipoCamion=("tipoCamion", "first"),
        edificioTipo=("edificioTipo", "first"),
        diaSemana=("diaSemana", "first"),
        horaLlegada=("horaLlegada", "first"),
        cantidadPalletsSolicitados=("cantidadPalletsSolicitados", "first"),
        onTime=("onTime", "first"),
        numItems=("itemId", "count"),
        solicitado=("cantidadSolicitada", "sum"),
        cargado=("cantidadCargadaTope", "sum"),
    ).reset_index()

    # Solo camiones con al menos una entrega (mismo universo que el KPI OTIF)
    agrupado = agrupado[agrupado["numItems"] > 0].copy()
    agrupado["inFull"] = agrupado["solicitado"] > 0
    agrupado.loc[agrupado["inFull"], "inFull"] = agrupado["cargado"] >= agrupado["solicitado"]
    agrupado["otif"] = (agrupado["onTime"] == True) & (agrupado["inFull"] == True)
    agrupado["label"] = agrupado["otif"].astype(int)
    return agrupado


def extraer_datos_sag(conn) -> pd.DataFrame:
    sql = """
        SELECT
          c.id AS "camionId",
          c.tipo AS "tipoCamion",
          p."edificioTipo",
          EXTRACT(DOW FROM c."horaLlegadaPlanificada")::int AS "diaSemana",
          EXTRACT(HOUR FROM c."horaLlegadaPlanificada")::int AS "horaLlegada",
          p."cantidadPalletsSolicitados",
          i.estado AS "estadoInspeccion",
          i."timestampResolucion",
          et."temperaturaRegistrada"
        FROM camiones c
        INNER JOIN paradas_expedicion p ON p."camionId" = c.id AND p.orden = 1
        INNER JOIN inspecciones_sag i ON i."camionId" = c.id
        LEFT JOIN eventos_tunel et ON et."camionId" = c.id
        WHERE c.tipo = 'EXPORTACION' AND i.estado IN ('APROBADO', 'RECHAZADO')
    """
    return pd.read_sql(sql, conn)


def construir_dataset_sag(filas: pd.DataFrame) -> pd.DataFrame:
    # Para cada camión, el resultado FINAL es la última inspección resuelta
    filas = filas.sort_values("timestampResolucion")
    final = filas.groupby("camionId").last().reset_index()
    final["label"] = (final["estadoInspeccion"] == "APROBADO").astype(int)
    return final

# ─── Featurización (codificación one-hot manual, reproducible en TS) ───────

CATEGORIAS_TIPO = ["NACIONAL", "EXPORTACION", "INTERPLANTA"]
CATEGORIAS_EDIFICIO = ["AVES", "CERDO", "FRIGORIFICO"]
CATEGORIAS_DIA = [0, 1, 2, 3, 4, 5, 6]  # 0=domingo ... 6=sábado (Postgres DOW)


def featurizar(df: pd.DataFrame) -> pd.DataFrame:
    tiene_temperatura = "temperaturaRegistrada" in df.columns
    filas = []
    for _, r in df.iterrows():
        fila = {}
        for t in CATEGORIAS_TIPO:
            fila[f"tipoCamion_{t}"] = 1 if r["tipoCamion"] == t else 0
        for e in CATEGORIAS_EDIFICIO:
            fila[f"edificioTipo_{e}"] = 1 if r["edificioTipo"] == e else 0
        for d in CATEGORIAS_DIA:
            fila[f"diaSemana_{d}"] = 1 if int(r["diaSemana"]) == d else 0
        fila["horaLlegada"] = float(r["horaLlegada"])
        fila["cantidadPalletsSolicitados"] = float(r["cantidadPalletsSolicitados"] or 0)
        if tiene_temperatura:
            fila["temperaturaRegistrada"] = float(r["temperaturaRegistrada"]) if pd.notna(r["temperaturaRegistrada"]) else -18.0
        filas.append(fila)
    return pd.DataFrame(filas)

# ─── Exportar árbol entrenado a JSON de reglas ──────────────────────────────

def exportar_arbol(modelo: DecisionTreeClassifier, feature_names: list[str]) -> dict:
    arbol = modelo.tree_

    def nodo(i: int) -> dict:
        if arbol.children_left[i] == arbol.children_right[i]:  # hoja
            # OJO: arbol.value[i] son conteos PONDERADOS por class_weight="balanced",
            # no la cantidad real de camiones históricos — usar siempre n_node_samples
            # (conteo real, sin ponderar) para reportar "confianza" de forma honesta.
            valores = arbol.value[i][0]
            total_real = int(arbol.n_node_samples[i])
            clase = int(valores.argmax())
            total_ponderado = valores.sum()
            prob = float(valores[clase] / total_ponderado) if total_ponderado > 0 else 0.5
            return {
                "hoja": True,
                "prediccion": clase,
                "probabilidad": round(prob, 4),
                "muestras": total_real,
            }
        return {
            "hoja": False,
            "feature": feature_names[arbol.feature[i]],
            "umbral": round(float(arbol.threshold[i]), 4),
            "muestras": int(arbol.n_node_samples[i]),
            "izquierda": nodo(arbol.children_left[i]),
            "derecha": nodo(arbol.children_right[i]),
        }

    return nodo(0)


def entrenar_y_exportar(nombre: str, X: pd.DataFrame, y: pd.Series, archivo_salida: Path, archivo_png: Path):
    print(f"\n{'='*70}\n📊 Modelo: {nombre}\n{'='*70}")
    print(f"Total de ejemplos: {len(X)} | Distribución de clases: {dict(y.value_counts())}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=SEED, stratify=y,
    )

    modelo = DecisionTreeClassifier(
        max_depth=MAX_DEPTH,
        min_samples_leaf=MIN_SAMPLES_LEAF,
        random_state=SEED,
        criterion="gini",
        class_weight="balanced",
    )
    modelo.fit(X_train, y_train)

    y_pred = modelo.predict(X_test)
    metricas = {
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_test, y_pred, zero_division=0), 4),
        "f1": round(f1_score(y_test, y_pred, zero_division=0), 4),
        "matrizConfusion": confusion_matrix(y_test, y_pred).tolist(),
        "nEntrenamiento": len(X_train),
        "nPrueba": len(X_test),
    }

    print(f"Accuracy: {metricas['accuracy']}  Precision: {metricas['precision']}  "
          f"Recall: {metricas['recall']}  F1: {metricas['f1']}")
    print("Matriz de confusión [[TN, FP], [FN, TP]]:", metricas["matrizConfusion"])
    print("\n" + classification_report(y_test, y_pred, zero_division=0))

    importancias = {
        f: round(float(imp), 4)
        for f, imp in sorted(
            zip(X.columns, modelo.feature_importances_),
            key=lambda kv: kv[1], reverse=True,
        ) if imp > 0
    }
    print("Importancia de variables (top):", dict(list(importancias.items())[:5]))

    # Exportar reglas a JSON (para evaluación en TypeScript)
    salida = {
        "objetivo": nombre,
        "featureNames": list(X.columns),
        "metricas": metricas,
        "importanciaFeatures": importancias,
        "arbol": exportar_arbol(modelo, list(X.columns)),
    }
    archivo_salida.write_text(json.dumps(salida, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ Modelo exportado a {archivo_salida}")

    # Visualización para el informe
    plt.figure(figsize=(22, 10))
    plot_tree(
        modelo, feature_names=list(X.columns), class_names=["NO", "SI"],
        filled=True, rounded=True, fontsize=8, proportion=True,
    )
    plt.title(f"Árbol de decisión — {nombre}")
    plt.tight_layout()
    plt.savefig(archivo_png, dpi=150)
    plt.close()
    print(f"🖼️  Visualización guardada en {archivo_png}")

    return metricas, importancias


def main():
    conn = conectar()
    try:
        print("🔌 Conectado a la base de datos. Extrayendo datos...")

        # ── Modelo OTIF ──
        lineas_otif = extraer_datos_otif(conn)
        dataset_otif = construir_dataset_otif(lineas_otif)
        X_otif = featurizar(dataset_otif)
        y_otif = dataset_otif["label"]
        metricas_otif, imp_otif = entrenar_y_exportar(
            "riesgoOTIF", X_otif, y_otif,
            DIR_MODELOS / "arbol-otif.json",
            DIR_INFORME / "arbol-otif.png",
        )

        # ── Modelo SAG ──
        filas_sag = extraer_datos_sag(conn)
        dataset_sag = construir_dataset_sag(filas_sag)
        X_sag = featurizar(dataset_sag)
        y_sag = dataset_sag["label"]
        metricas_sag, imp_sag = entrenar_y_exportar(
            "riesgoSAG", X_sag, y_sag,
            DIR_MODELOS / "arbol-sag.json",
            DIR_INFORME / "arbol-sag.png",
        )

        # Reporte resumen para el informe
        reporte = f"""# Resultados del modelo predictivo (árbol de decisión)

Generado automáticamente por `apps/api/ml/entrenar_modelos.py`.

## Modelo 1 — Riesgo OTIF (todos los tipos de camión)

- Ejemplos: {len(X_otif)} (entrenamiento: {metricas_otif['nEntrenamiento']}, prueba: {metricas_otif['nPrueba']})
- Accuracy: {metricas_otif['accuracy']}
- Precision: {metricas_otif['precision']}
- Recall: {metricas_otif['recall']}
- F1-score: {metricas_otif['f1']}
- Matriz de confusión [[TN, FP], [FN, TP]]: {metricas_otif['matrizConfusion']}
- Variables más importantes: {json.dumps(dict(list(imp_otif.items())[:5]), ensure_ascii=False)}

## Modelo 2 — Riesgo SAG (solo camiones de exportación)

- Ejemplos: {len(X_sag)} (entrenamiento: {metricas_sag['nEntrenamiento']}, prueba: {metricas_sag['nPrueba']})
- Accuracy: {metricas_sag['accuracy']}
- Precision: {metricas_sag['precision']}
- Recall: {metricas_sag['recall']}
- F1-score: {metricas_sag['f1']}
- Matriz de confusión [[TN, FP], [FN, TP]]: {metricas_sag['matrizConfusion']}
- Variables más importantes: {json.dumps(dict(list(imp_sag.items())[:5]), ensure_ascii=False)}

> Nota metodológica: el rechazo SAG se generó en el dataset sintético como un evento
> aproximadamente aleatorio (probabilidad fija, independiente de otras variables),
> por lo que es esperable que este modelo muestre bajo poder predictivo — es un
> hallazgo honesto sobre el dataset, no una falla del modelo.
"""
        (DIR_INFORME / "reporte-metricas.md").write_text(reporte, encoding="utf-8")
        print(f"\n📄 Reporte de métricas guardado en {DIR_INFORME / 'reporte-metricas.md'}")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
