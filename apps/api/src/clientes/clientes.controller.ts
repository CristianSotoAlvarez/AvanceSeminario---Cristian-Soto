import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TipoCamion } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decoradores/roles.decorator';
import { ClientesService } from './clientes.service';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  @Roles('JEFE_DESPACHO', 'COORDINADOR_TRANSPORTE', 'COORDINADOR', 'SAG')
  @ApiOperation({ summary: 'Listar clientes con filtro opcional por tipo' })
  @ApiQuery({ name: 'tipo', enum: TipoCamion, required: false })
  listar(@Query('tipo') tipo?: TipoCamion) {
    return this.clientesService.listar(tipo);
  }

  @Get(':id')
  @Roles('JEFE_DESPACHO', 'COORDINADOR_TRANSPORTE', 'COORDINADOR', 'SAG')
  @ApiOperation({ summary: 'Obtener cliente por ID con historial de camiones' })
  obtener(@Param('id') id: string) {
    return this.clientesService.obtener(id);
  }

  @Post()
  @Roles('JEFE_DESPACHO', 'COORDINADOR_TRANSPORTE')
  @ApiOperation({ summary: 'Crear nuevo cliente' })
  crear(@Body() dto: CrearClienteDto) {
    return this.clientesService.crear(dto);
  }

  @Patch(':id')
  @Roles('JEFE_DESPACHO', 'COORDINADOR_TRANSPORTE')
  @ApiOperation({ summary: 'Actualizar cliente' })
  actualizar(@Param('id') id: string, @Body() dto: ActualizarClienteDto) {
    return this.clientesService.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles('JEFE_DESPACHO')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar cliente (soft delete)' })
  eliminar(@Param('id') id: string) {
    return this.clientesService.eliminar(id);
  }
}
