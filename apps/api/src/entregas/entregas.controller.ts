import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ROLES_GESTION_OPERATIVA, ROLES_SUPERVISION } from '../auth/roles';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decoradores/roles.decorator';
import { EntregasService } from './entregas.service';
import { CrearEntregaDto } from './dto/crear-entrega.dto';

/** Roles que pueden alterar la estructura de entregas de un camión. */

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class EntregasController {
  constructor(private readonly entregasService: EntregasService) {}

  // GET /camiones/:camionId/entregas — lectura abierta: picking y carga la necesitan
  @Get('camiones/:camionId/entregas')
  listarPorCamion(@Param('camionId') camionId: string) {
    return this.entregasService.listarPorCamion(camionId);
  }

  // GET /entregas/:id
  @Get('entregas/:id')
  obtenerPorId(@Param('id') id: string) {
    return this.entregasService.obtenerPorId(id);
  }

  // POST /entregas
  @Post('entregas')
  @Roles(...ROLES_GESTION_OPERATIVA)
  crear(@Body() dto: CrearEntregaDto) {
    return this.entregasService.crear(dto);
  }

  // DELETE /entregas/:id — elimina en cascada los ítems y desvincula los pallets
  @Delete('entregas/:id')
  @Roles(...ROLES_GESTION_OPERATIVA)
  eliminar(@Param('id') id: string) {
    return this.entregasService.eliminar(id);
  }
}
