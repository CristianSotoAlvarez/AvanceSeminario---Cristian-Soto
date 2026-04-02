-- CreateEnum
CREATE TYPE "EstadoParada" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO');

-- CreateTable
CREATE TABLE "paradas_expedicion" (
    "id" TEXT NOT NULL,
    "camionId" TEXT NOT NULL,
    "andenId" TEXT,
    "edificioTipo" "TipoEdificio" NOT NULL,
    "orden" INTEGER NOT NULL,
    "estado" "EstadoParada" NOT NULL DEFAULT 'PENDIENTE',
    "horaInicio" TIMESTAMP(3),
    "horaFin" TIMESTAMP(3),

    CONSTRAINT "paradas_expedicion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "paradas_expedicion_camionId_idx" ON "paradas_expedicion"("camionId");

-- AddForeignKey
ALTER TABLE "paradas_expedicion" ADD CONSTRAINT "paradas_expedicion_camionId_fkey" FOREIGN KEY ("camionId") REFERENCES "camiones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paradas_expedicion" ADD CONSTRAINT "paradas_expedicion_andenId_fkey" FOREIGN KEY ("andenId") REFERENCES "andenes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
