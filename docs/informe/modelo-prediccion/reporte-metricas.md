# Resultados del modelo predictivo (árbol de decisión)

Generado automáticamente por `apps/api/ml/entrenar_modelos.py`.

## Modelo 1 — Riesgo OTIF (todos los tipos de camión)

- Ejemplos: 12323 (entrenamiento: 9858, prueba: 2465)
- Accuracy: 0.7063
- Precision: 0.3355
- Recall: 0.9598
- F1-score: 0.4972
- Matriz de confusión [[TN, FP], [FN, TP]]: [[1383, 709], [15, 358]]
- Variables más importantes: {"cantidadPalletsSolicitados": 0.9888, "horaLlegada": 0.0086, "diaSemana_6": 0.0026}

## Modelo 2 — Riesgo SAG (solo camiones de exportación)

- Ejemplos: 6027 (entrenamiento: 4821, prueba: 1206)
- Accuracy: 0.5647
- Precision: 0.6974
- Recall: 0.5806
- F1-score: 0.6336
- Matriz de confusión [[TN, FP], [FN, TP]]: [[227, 197], [328, 454]]
- Variables más importantes: {"horaLlegada": 0.4257, "cantidadPalletsSolicitados": 0.183, "diaSemana_5": 0.1198, "diaSemana_1": 0.1194, "edificioTipo_AVES": 0.0672}

> Nota metodológica: el rechazo SAG se generó en el dataset sintético como un evento
> aproximadamente aleatorio (probabilidad fija, independiente de otras variables),
> por lo que es esperable que este modelo muestre bajo poder predictivo — es un
> hallazgo honesto sobre el dataset, no una falla del modelo.
