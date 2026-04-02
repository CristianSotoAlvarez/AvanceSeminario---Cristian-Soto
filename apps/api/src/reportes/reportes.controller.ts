import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decoradores/roles.decorator';

@ApiTags('Reportes')
@ApiBearerAuth()
@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('resumen')
  @Roles('JEFE_DESPACHO', 'COORDINADOR_TRANSPORTE', 'COORDINADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Obtener KPIs operacionales del rango de fechas indicado' })
  resumen(@Query() query: { desde?: string; hasta?: string }) {
    return this.reportesService.resumen(query);
  }
}
