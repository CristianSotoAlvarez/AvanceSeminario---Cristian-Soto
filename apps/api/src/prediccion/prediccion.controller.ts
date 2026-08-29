import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrediccionService } from './prediccion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Predicción')
@ApiBearerAuth()
@Controller('prediccion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrediccionController {
  constructor(private readonly prediccionService: PrediccionService) {}

  @Get('modelos')
  @ApiOperation({ summary: 'Métricas e importancia de variables de los modelos entrenados' })
  obtenerInfoModelos() {
    return this.prediccionService.obtenerInfoModelos();
  }

  @Get(':camionId')
  @ApiOperation({ summary: 'Predicción de riesgo OTIF y (si aplica) riesgo SAG para un camión' })
  predecir(@Param('camionId') camionId: string) {
    return this.prediccionService.predecirParaCamion(camionId);
  }
}
