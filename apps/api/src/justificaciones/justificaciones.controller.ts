import { Body, Controller, Delete, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JustificacionesService } from './justificaciones.service';
import { CrearJustificacionDto } from './dto/crear-justificacion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('paradas')
export class JustificacionesController {
  constructor(private readonly justificacionesService: JustificacionesService) {}

  @Post(':paradaId/justificar')
  justificar(
    @Param('paradaId') paradaId: string,
    @Body() dto: CrearJustificacionDto,
    @Req() req: any,
  ) {
    return this.justificacionesService.crearJustificacion(
      paradaId,
      dto,
      req.user.id,
      req.user.rol,
    );
  }

  @Delete(':paradaId/justificar')
  eliminar(@Param('paradaId') paradaId: string, @Req() req: any) {
    return this.justificacionesService.eliminarJustificacion(paradaId, req.user.rol);
  }
}
