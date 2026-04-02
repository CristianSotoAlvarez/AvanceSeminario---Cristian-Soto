import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EntregasService } from './entregas.service';
import { CrearEntregaDto } from './dto/crear-entrega.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class EntregasController {
  constructor(private readonly entregasService: EntregasService) {}

  // GET /camiones/:camionId/entregas
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
  crear(@Body() dto: CrearEntregaDto) {
    return this.entregasService.crear(dto);
  }

  // DELETE /entregas/:id
  @Delete('entregas/:id')
  eliminar(@Param('id') id: string) {
    return this.entregasService.eliminar(id);
  }
}
