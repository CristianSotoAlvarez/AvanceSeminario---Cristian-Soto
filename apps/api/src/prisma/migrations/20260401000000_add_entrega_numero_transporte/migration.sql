-- AlterTable: agregar numeroTransporte a camiones
ALTER TABLE "camiones" ADD COLUMN "numeroTransporte" TEXT;
CREATE UNIQUE INDEX "camiones_numeroTransporte_key" ON "camiones"("numeroTransporte");

-- CreateTable: entregas
CREATE TABLE "entregas" (
    "id" TEXT NOT NULL,
    "camionId" TEXT NOT NULL,
    "paradaId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entregas_paradaId_key" ON "entregas"("paradaId");
CREATE INDEX "entregas_camionId_idx" ON "entregas"("camionId");

-- AlterTable pallets: reemplazar camionId por entregaId
ALTER TABLE "pallets" ADD COLUMN "entregaId" TEXT;

-- Migrar datos existentes: crear una entrega por cada camionId distinto en pallets
-- y reasignar pallets a esa entrega
DO $$
DECLARE
    r RECORD;
    nueva_entrega_id TEXT;
BEGIN
    FOR r IN SELECT DISTINCT "camionId" FROM "pallets" WHERE "camionId" IS NOT NULL LOOP
        nueva_entrega_id := gen_random_uuid()::text;
        INSERT INTO "entregas" ("id", "camionId") VALUES (nueva_entrega_id, r."camionId");
        UPDATE "pallets" SET "entregaId" = nueva_entrega_id WHERE "camionId" = r."camionId";
    END LOOP;
END $$;

-- Eliminar camionId de pallets
ALTER TABLE "pallets" DROP COLUMN "camionId";

-- CreateIndex pallets
CREATE INDEX "pallets_entregaId_idx" ON "pallets"("entregaId");

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_camionId_fkey" FOREIGN KEY ("camionId") REFERENCES "camiones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_paradaId_fkey" FOREIGN KEY ("paradaId") REFERENCES "paradas_expedicion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pallets" ADD CONSTRAINT "pallets_entregaId_fkey" FOREIGN KEY ("entregaId") REFERENCES "entregas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
