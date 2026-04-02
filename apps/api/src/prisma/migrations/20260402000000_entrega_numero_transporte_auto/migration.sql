-- Agregar campo numero autoincremental a entregas
CREATE SEQUENCE IF NOT EXISTS entregas_numero_seq START 1;
ALTER TABLE "entregas" ADD COLUMN "numero" INTEGER NOT NULL DEFAULT nextval('entregas_numero_seq');
CREATE UNIQUE INDEX "entregas_numero_key" ON "entregas"("numero");
ALTER SEQUENCE entregas_numero_seq OWNED BY "entregas"."numero";
