# Diagramas del sistema — DispatchTrack

Diagramas generados a partir del modelo de datos y la lógica reales del sistema (esquema Prisma y máquina de estados). Están escritos en **Mermaid**, por lo que se renderizan automáticamente en GitHub, en VS Code (con vista previa de Mermaid) y al exportar a PDF con extensiones que soporten Mermaid.

Contenido:
1. Modelo Entidad-Relación (MER) completo
2. MER simplificado (núcleo del flujo)
3. Máquina de estados del camión
4. Máquina de estados del pallet
5. Diagrama de flujo del proceso operativo

---

## 1. Modelo Entidad-Relación (MER) completo

```mermaid
erDiagram
    USUARIO {
        string id PK
        string nombre
        string rut UK
        string email UK
        enum   rol
        bool   polivalente
        string edificioId FK
        bool   activo
    }
    EDIFICIO {
        string id PK
        string nombre
        enum   tipo UK
    }
    ANDEN {
        string id PK
        string codigo UK
        string edificioId FK
        bool   ocupado
        bool   fueraDeServicio
        string motivoFueraServicio
        string fueraServicioPorId FK
    }
    CLIENTE {
        string id PK
        string nombre
        string rut UK
        string codigo UK
        enum   tipoDestino
        string pais
    }
    PEDIDO {
        string id PK
        string numero UK
        string clienteId FK
        int    totalPallets
        int    totalBultos
        datetime fechaEntrega
    }
    CAMION {
        string id PK
        string patente
        string numeroTransporte UK
        enum   tipo
        enum   estado
        string clienteId FK
        string pedidoId FK
        string andenId FK
        datetime horaLlegadaPlanificada
        datetime horaSalidaPlanificada
        datetime horaLlegadaReal
        datetime horaSalidaReal
        bool   enReparacion
        string reemplazadoPorId FK
    }
    INCIDENTE_CAMION {
        string id PK
        string camionId FK
        enum   tipo
        enum   accion
        enum   estadoCamionEnIncidente
        string descripcion
        string registradoPorId FK
        datetime timestamp
        datetime resueltoEn
        string camionReemplazoId FK
    }
    EVENTO_CAMION {
        string id PK
        string camionId FK
        enum   estado
        datetime timestamp
        string usuarioId FK
        string nota
    }
    PARADA_EXPEDICION {
        string id PK
        string camionId FK
        string andenId FK
        enum   edificioTipo
        int    orden
        enum   estado
        int    cantidadPalletsSolicitados
        datetime horaInicio
        datetime horaFin
    }
    ENTREGA {
        string id PK
        int    numero UK
        string camionId FK
        string paradaId FK
        datetime creadoEn
    }
    ENTREGA_ITEM {
        string id PK
        string entregaId FK
        string productoId FK
        int    cantidadSolicitada
    }
    PRODUCTO {
        string id PK
        string sku UK
        string nombre
        string unidadMedida
        float  pesoKgUnitario
        bool   activo
    }
    PALLET {
        string id PK
        string codigoUnico UK
        string entregaId FK
        string pedidoId FK
        string pickineroId FK
        string cargadorId FK
        enum   estado
        datetime timestampInicio
        datetime timestampFin
        int    tiempoArmadoSegundos
    }
    PRODUCTO_PALLET {
        string id PK
        string palletId FK
        string productoId FK
        string descripcion
        int    cantidad
        float  pesoKg
        float  temperatura
    }
    INSPECCION_SAG {
        string id PK
        string camionId FK
        string inspectorId FK
        enum   estado
        datetime timestampInicio
        datetime timestampResolucion
        string observaciones
    }
    EVENTO_TUNEL {
        string id PK
        string camionId FK
        string operadorId FK
        float  temperaturaRegistrada
        datetime timestamp
    }
    JUSTIFICACION_ATRASO {
        string id PK
        string paradaId FK,UK
        enum   causa
        string descripcion
        bool   excluirDelCalculo
        string registradoPorId FK
    }
    ATRASO {
        string id PK
        string camionId FK
        string edificioId FK
        string motivoCodigo
        int    minutosAtraso
        string registradoPor FK
    }
    AUDIT_LOG {
        string id PK
        string usuarioId FK
        string accion
        string entidadTipo
        string entidadId
        json   payload
    }

    EDIFICIO   ||--o{ ANDEN              : "tiene"
    EDIFICIO   ||--o{ USUARIO            : "asigna"
    EDIFICIO   ||--o{ ATRASO             : "registra"
    USUARIO    }o--o| EDIFICIO           : "pertenece"
    ANDEN      }o--o| USUARIO            : "marcado fuera de servicio por"
    ANDEN      ||--o{ CAMION             : "aloja"
    ANDEN      ||--o{ PARADA_EXPEDICION  : "destino de"
    CLIENTE    ||--o{ PEDIDO             : "realiza"
    CLIENTE    ||--o{ CAMION             : "asociado a"
    PEDIDO     ||--o{ CAMION             : "transportado por"
    PEDIDO     ||--o{ PALLET             : "agrupa"
    CAMION     ||--o{ EVENTO_CAMION      : "genera"
    CAMION     ||--o{ ENTREGA            : "contiene"
    CAMION     ||--o{ PARADA_EXPEDICION  : "recorre"
    CAMION     ||--o{ INSPECCION_SAG     : "inspeccionado en"
    CAMION     ||--o{ EVENTO_TUNEL       : "registra temperatura"
    CAMION     ||--o{ ATRASO             : "acumula"
    CAMION     ||--o{ INCIDENTE_CAMION   : "sufre"
    CAMION     |o--o| CAMION             : "sustituido por"
    INCIDENTE_CAMION }o--|| USUARIO      : "registrado por"
    EVENTO_CAMION    }o--o| USUARIO      : "ejecutado por"
    PARADA_EXPEDICION ||--o| ENTREGA     : "produce"
    PARADA_EXPEDICION ||--o| JUSTIFICACION_ATRASO : "justificada con"
    ENTREGA    ||--o{ ENTREGA_ITEM       : "solicita"
    ENTREGA    ||--o{ PALLET             : "se compone de"
    PRODUCTO   ||--o{ ENTREGA_ITEM       : "solicitado en"
    PRODUCTO   ||--o{ PRODUCTO_PALLET    : "cargado en"
    PALLET     ||--o{ PRODUCTO_PALLET    : "contiene"
    USUARIO    ||--o{ PALLET             : "arma (pickinero)"
    USUARIO    ||--o{ PALLET             : "carga (cargador)"
    USUARIO    ||--o{ INSPECCION_SAG     : "inspecciona"
    USUARIO    ||--o{ EVENTO_TUNEL       : "opera"
    USUARIO    ||--o{ JUSTIFICACION_ATRASO : "registra"
    USUARIO    ||--o{ ATRASO             : "reporta"
    USUARIO    ||--o{ AUDIT_LOG          : "audita"
```

---

## 2. MER simplificado (núcleo del flujo)

Versión reducida para ilustrar el corazón del modelo sin el detalle de auditoría y eventos.

```mermaid
erDiagram
    CLIENTE   ||--o{ PEDIDO  : realiza
    PEDIDO    ||--o{ CAMION  : "transportado por"
    CAMION    ||--o{ PARADA_EXPEDICION : recorre
    EDIFICIO  ||--o{ ANDEN   : tiene
    ANDEN     ||--o{ PARADA_EXPEDICION : "destino de"
    PARADA_EXPEDICION ||--o| ENTREGA : produce
    ENTREGA   ||--o{ ENTREGA_ITEM : solicita
    ENTREGA   ||--o{ PALLET  : "se compone de"
    PRODUCTO  ||--o{ ENTREGA_ITEM : "solicitado en"
    PRODUCTO  ||--o{ PRODUCTO_PALLET : "cargado en"
    PALLET    ||--o{ PRODUCTO_PALLET : contiene
    USUARIO   ||--o{ PALLET  : "arma / carga"
    CAMION    ||--o{ INSPECCION_SAG : "inspeccionado (exportación)"
```

---

## 3. Máquina de estados del camión

Transiciones válidas según el tipo de camión. Exportación incorpora túnel de frío e inspección SAG.

```mermaid
stateDiagram-v2
    [*] --> ESPERADO : se programa
    ESPERADO --> EN_PORTERIA : registra llegada (portería)
    EN_PORTERIA --> ASIGNADO : asigna andén (coordinador)
    ASIGNADO --> EN_CARGA : inicia carga (cargador)

    EN_CARGA --> LISTO : finaliza carga (nacional / interplanta)
    EN_CARGA --> EN_TUNEL_FRIO : finaliza carga (exportación)

    EN_TUNEL_FRIO --> ESPERANDO_SAG : temperatura OK (op. túnel)
    ESPERANDO_SAG --> APROBADO_SAG : aprueba SAG
    ESPERANDO_SAG --> RECHAZADO_SAG : rechaza SAG
    RECHAZADO_SAG --> ESPERANDO_SAG : corrige y reenvía
    APROBADO_SAG --> LISTO : marca listo (coordinador)

    LISTO --> DESPACHADO : despacha (coordinador)
    DESPACHADO --> [*]

    EN_PORTERIA --> AVERIADO : avería + sustitución
    ASIGNADO --> AVERIADO : avería + sustitución
    EN_CARGA --> AVERIADO : avería + sustitución
    AVERIADO --> [*]

    note right of AVERIADO
        El camión averiado queda terminal.
        Su carga se traspasa a un camión sustituto.
    end note
```

---

## 4. Máquina de estados del pallet

```mermaid
stateDiagram-v2
    [*] --> EN_ARMADO : crea pallet
    EN_ARMADO --> ARMADO : marca armado (pickinero)
    ARMADO --> CARGADO : marca cargado (cargador)
    CARGADO --> VERIFICADO : verifica (gestión)
    VERIFICADO --> [*]

    note right of EN_ARMADO
        Mientras está EN_ARMADO el
        pickinero agrega productos.
        Se mide el tiempo de armado.
    end note
```

---

## 5. Diagrama de flujo del proceso operativo

Recorrido de un camión por los distintos roles y pantallas.

```mermaid
flowchart TD
    A([Coordinador Transporte<br/>programa el camión]) --> B[Portería<br/>registra llegada por QR o lista]
    B --> C[Coordinador<br/>asigna andén]
    C --> D[Pickinero<br/>arma pallets]
    D --> E[Cargador<br/>carga pallets al camión]
    E --> F{¿Es exportación?}
    F -- No --> I[Coordinador<br/>marca listo]
    F -- Sí --> G[Operador Túnel<br/>valida temperatura -18°C]
    G --> H[Inspector SAG<br/>aprueba o rechaza]
    H -- Rechazado --> H2[Corrige y reenvía a SAG]
    H2 --> H
    H -- Aprobado --> I
    I --> J([Coordinador<br/>despacha el camión])

    C -.->|si el andén falla| K[Supervisor<br/>marca andén fuera de servicio]
    C -.->|si el camión se avería| L[Supervisor<br/>repara o sustituye camión]
```

---

## Cómo visualizar / exportar estos diagramas

- **GitHub:** se renderizan solos al ver el archivo en el repositorio.
- **VS Code:** vista previa con `Ctrl+Shift+V` (instalá la extensión *Markdown Preview Mermaid Support* si no se ven).
- **PDF:** ver instrucciones en la sección de exportación del README del informe.
