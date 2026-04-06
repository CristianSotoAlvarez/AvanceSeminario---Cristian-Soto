import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductosService } from './productos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decoradores/roles.decorator';

@ApiTags('Productos')
@ApiBearerAuth()
@Controller('productos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar productos del catálogo' })
  listar(@Query('todos') todos?: string) {
    return this.productosService.listar(todos !== 'true');
  }

  @Post()
  @Roles('JEFE_DESPACHO', 'COORDINADOR_TRANSPORTE', 'COORDINADOR')
  @ApiOperation({ summary: 'Crear producto' })
  crear(@Body() body: { sku: string; nombre: string; unidadMedida?: string; pesoKgUnitario?: number }) {
    return this.productosService.crear(body);
  }

  @Patch(':id')
  @Roles('JEFE_DESPACHO', 'COORDINADOR_TRANSPORTE', 'COORDINADOR')
  @ApiOperation({ summary: 'Actualizar producto' })
  actualizar(@Param('id') id: string, @Body() body: { nombre?: string; unidadMedida?: string; pesoKgUnitario?: number; activo?: boolean }) {
    return this.productosService.actualizar(id, body);
  }

  @Post('importar-csv')
  @Roles('JEFE_DESPACHO', 'COORDINADOR_TRANSPORTE', 'COORDINADOR')
  @ApiOperation({ summary: 'Importar productos desde CSV (array de filas)' })
  importarCsv(@Body() body: { filas: { sku: string; nombre: string; unidadMedida?: string; pesoKgUnitario?: string }[] }) {
    return this.productosService.importarCsv(body.filas);
  }

  // ─── Items de entrega ────────────────────────────────────────────────────────

  @Get('entrega/:entregaId')
  @ApiOperation({ summary: 'Obtener items de una entrega con progreso de carga' })
  obtenerItemsEntrega(@Param('entregaId') entregaId: string) {
    return this.productosService.obtenerItemsEntrega(entregaId);
  }

  @Post('entrega/:entregaId')
  @Roles('JEFE_DESPACHO', 'COORDINADOR_TRANSPORTE', 'COORDINADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Establecer productos solicitados para una entrega' })
  setItemsEntrega(
    @Param('entregaId') entregaId: string,
    @Body() body: { items: { productoId: string; cantidadSolicitada: number }[] },
  ) {
    return this.productosService.setItemsEntrega(entregaId, body.items);
  }
}
