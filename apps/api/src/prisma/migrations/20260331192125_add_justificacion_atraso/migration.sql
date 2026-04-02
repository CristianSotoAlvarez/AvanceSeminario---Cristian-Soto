-- CreateEnum
CREATE TYPE "CausaJustificacion" AS ENUM ('FALLA_ANDEN', 'FALLA_MECANICA', 'FALTA_PERSONAL', 'VOLUMEN_EXCESIVO', 'PROBLEMA_CALIDAD', 'OTRO');

-- CreateTable
CREATE TABLE "justificaciones_atraso" (
    "id" TEXT NOT NULL,
    "paradaId" TEXT NOT NULL,
    "causa" "CausaJustificacion" NOT NULL,
    "descripcion" TEXT,
    "excluirDelCalculo" BOOLEAN NOT NULL DEFAULT true,
    "registradoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "justificaciones_atraso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "justificaciones_atraso_paradaId_key" ON "justificaciones_atraso"("paradaId");

-- CreateIndex
CREATE INDEX "justificaciones_atraso_paradaId_idx" ON "justificaciones_atraso"("paradaId");

-- AddForeignKey
ALTER TABLE "justificaciones_atraso" ADD CONSTRAINT "justificaciones_atraso_paradaId_fkey" FOREIGN KEY ("paradaId") REFERENCES "paradas_expedicion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justificaciones_atraso" ADD CONSTRAINT "justificaciones_atraso_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
