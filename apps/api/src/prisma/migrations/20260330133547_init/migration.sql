-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('COORDINADOR_TRANSPORTE', 'COORDINADOR', 'PICKINERO', 'CARGADOR', 'SUPERVISOR', 'OPERADOR_TUNEL', 'JEFE_DESPACHO', 'SAG');

-- CreateEnum
CREATE TYPE "TipoEdificio" AS ENUM ('AVES', 'CERDO', 'FRIGORIFICO');

-- CreateEnum
CREATE TYPE "EstadoCamion" AS ENUM ('ESPERADO', 'EN_PORTERIA', 'ASIGNADO', 'EN_CARGA', 'EN_TUNEL_FRIO', 'ESPERANDO_SAG', 'APROBADO_SAG', 'RECHAZADO_SAG', 'LISTO', 'DESPACHADO');

-- CreateEnum
CREATE TYPE "TipoCamion" AS ENUM ('NACIONAL', 'EXPORTACION', 'INTERPLANTA');

-- CreateEnum
CREATE TYPE "EstadoInspeccion" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "EstadoPallet" AS ENUM ('EN_ARMADO', 'ARMADO', 'CARGADO', 'VERIFICADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "edificioId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edificios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoEdificio" NOT NULL,

    CONSTRAINT "edificios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "andenes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "edificioId" TEXT NOT NULL,
    "ocupado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "andenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "tipoDestino" "TipoCamion" NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "totalPallets" INTEGER NOT NULL,
    "totalBultos" INTEGER NOT NULL,
    "fechaEntrega" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camiones" (
    "id" TEXT NOT NULL,
    "patente" TEXT NOT NULL,
    "tipo" "TipoCamion" NOT NULL,
    "estado" "EstadoCamion" NOT NULL DEFAULT 'ESPERADO',
    "pedidoId" TEXT,
    "andenId" TEXT,
    "horaLlegadaPlanificada" TIMESTAMP(3) NOT NULL,
    "horaSalidaPlanificada" TIMESTAMP(3),
    "horaLlegadaReal" TIMESTAMP(3),
    "horaSalidaReal" TIMESTAMP(3),
    "cargaPreviaDescripcion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "camiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_camion" (
    "id" TEXT NOT NULL,
    "camionId" TEXT NOT NULL,
    "estado" "EstadoCamion" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,
    "nota" TEXT,

    CONSTRAINT "eventos_camion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pallets" (
    "id" TEXT NOT NULL,
    "codigoUnico" TEXT NOT NULL,
    "camionId" TEXT,
    "pedidoId" TEXT,
    "pickineroId" TEXT,
    "cargadorId" TEXT,
    "edificioId" TEXT,
    "estado" "EstadoPallet" NOT NULL DEFAULT 'EN_ARMADO',
    "timestampInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timestampFin" TIMESTAMP(3),
    "tiempoArmadoSegundos" INTEGER,

    CONSTRAINT "pallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos_pallet" (
    "id" TEXT NOT NULL,
    "palletId" TEXT NOT NULL,
    "codigoBarras" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "pesoKg" DOUBLE PRECISION NOT NULL,
    "temperatura" DOUBLE PRECISION,

    CONSTRAINT "productos_pallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspecciones_sag" (
    "id" TEXT NOT NULL,
    "camionId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "estado" "EstadoInspeccion" NOT NULL DEFAULT 'PENDIENTE',
    "timestampInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timestampResolucion" TIMESTAMP(3),
    "observaciones" TEXT,
    "documentoUrl" TEXT,

    CONSTRAINT "inspecciones_sag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_tunel" (
    "id" TEXT NOT NULL,
    "camionId" TEXT NOT NULL,
    "operadorId" TEXT NOT NULL,
    "temperaturaRegistrada" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,

    CONSTRAINT "eventos_tunel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atrasos" (
    "id" TEXT NOT NULL,
    "camionId" TEXT NOT NULL,
    "edificioId" TEXT NOT NULL,
    "motivoCodigo" TEXT NOT NULL,
    "motivoDetalle" TEXT,
    "minutosAtraso" INTEGER NOT NULL,
    "registradoPor" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atrasos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "entidadTipo" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "payload" JSONB,
    "ip" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_rut_key" ON "usuarios"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "edificios_tipo_key" ON "edificios"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "andenes_codigo_key" ON "andenes"("codigo");

-- CreateIndex
CREATE INDEX "andenes_edificioId_idx" ON "andenes"("edificioId");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_rut_key" ON "clientes"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_numero_key" ON "pedidos"("numero");

-- CreateIndex
CREATE INDEX "camiones_estado_idx" ON "camiones"("estado");

-- CreateIndex
CREATE INDEX "camiones_tipo_idx" ON "camiones"("tipo");

-- CreateIndex
CREATE INDEX "camiones_andenId_idx" ON "camiones"("andenId");

-- CreateIndex
CREATE INDEX "eventos_camion_camionId_idx" ON "eventos_camion"("camionId");

-- CreateIndex
CREATE INDEX "eventos_camion_timestamp_idx" ON "eventos_camion"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "pallets_codigoUnico_key" ON "pallets"("codigoUnico");

-- CreateIndex
CREATE INDEX "pallets_camionId_idx" ON "pallets"("camionId");

-- CreateIndex
CREATE INDEX "pallets_pedidoId_idx" ON "pallets"("pedidoId");

-- CreateIndex
CREATE INDEX "inspecciones_sag_camionId_idx" ON "inspecciones_sag"("camionId");

-- CreateIndex
CREATE INDEX "atrasos_camionId_idx" ON "atrasos"("camionId");

-- CreateIndex
CREATE INDEX "audit_log_entidadTipo_entidadId_idx" ON "audit_log"("entidadTipo", "entidadId");

-- CreateIndex
CREATE INDEX "audit_log_timestamp_idx" ON "audit_log"("timestamp");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_edificioId_fkey" FOREIGN KEY ("edificioId") REFERENCES "edificios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "andenes" ADD CONSTRAINT "andenes_edificioId_fkey" FOREIGN KEY ("edificioId") REFERENCES "edificios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camiones" ADD CONSTRAINT "camiones_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camiones" ADD CONSTRAINT "camiones_andenId_fkey" FOREIGN KEY ("andenId") REFERENCES "andenes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_camion" ADD CONSTRAINT "eventos_camion_camionId_fkey" FOREIGN KEY ("camionId") REFERENCES "camiones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_camion" ADD CONSTRAINT "eventos_camion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pallets" ADD CONSTRAINT "pallets_camionId_fkey" FOREIGN KEY ("camionId") REFERENCES "camiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pallets" ADD CONSTRAINT "pallets_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pallets" ADD CONSTRAINT "pallets_pickineroId_fkey" FOREIGN KEY ("pickineroId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pallets" ADD CONSTRAINT "pallets_cargadorId_fkey" FOREIGN KEY ("cargadorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_pallet" ADD CONSTRAINT "productos_pallet_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES "pallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones_sag" ADD CONSTRAINT "inspecciones_sag_camionId_fkey" FOREIGN KEY ("camionId") REFERENCES "camiones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones_sag" ADD CONSTRAINT "inspecciones_sag_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_tunel" ADD CONSTRAINT "eventos_tunel_camionId_fkey" FOREIGN KEY ("camionId") REFERENCES "camiones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_tunel" ADD CONSTRAINT "eventos_tunel_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atrasos" ADD CONSTRAINT "atrasos_camionId_fkey" FOREIGN KEY ("camionId") REFERENCES "camiones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atrasos" ADD CONSTRAINT "atrasos_edificioId_fkey" FOREIGN KEY ("edificioId") REFERENCES "edificios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atrasos" ADD CONSTRAINT "atrasos_registradoPor_fkey" FOREIGN KEY ("registradoPor") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
