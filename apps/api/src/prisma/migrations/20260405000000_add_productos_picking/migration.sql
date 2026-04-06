-- Catálogo de productos internos
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidadMedida" TEXT NOT NULL DEFAULT 'caja',
    "pesoKgUnitario" DOUBLE PRECISION,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "productos_sku_key" ON "productos"("sku");

-- Items solicitados por entrega (qué producto y cuánto)
CREATE TABLE "entrega_items" (
    "id" TEXT NOT NULL,
    "entregaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidadSolicitada" INTEGER NOT NULL,

    CONSTRAINT "entrega_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "entrega_items_entregaId_productoId_key" ON "entrega_items"("entregaId", "productoId");
CREATE INDEX "entrega_items_entregaId_idx" ON "entrega_items"("entregaId");

-- Relacionar producto del catálogo con productos_pallet
ALTER TABLE "productos_pallet" ADD COLUMN IF NOT EXISTS "productoId" TEXT;

-- Hacer opcionales codigoBarras y pesoKg (eran NOT NULL en init)
ALTER TABLE "productos_pallet" ALTER COLUMN "codigoBarras" DROP NOT NULL;
ALTER TABLE "productos_pallet" ALTER COLUMN "pesoKg" DROP NOT NULL;

-- Foreign keys
ALTER TABLE "entrega_items" ADD CONSTRAINT "entrega_items_entregaId_fkey"
    FOREIGN KEY ("entregaId") REFERENCES "entregas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "entrega_items" ADD CONSTRAINT "entrega_items_productoId_fkey"
    FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "productos_pallet" ADD CONSTRAINT "productos_pallet_productoId_fkey"
    FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
