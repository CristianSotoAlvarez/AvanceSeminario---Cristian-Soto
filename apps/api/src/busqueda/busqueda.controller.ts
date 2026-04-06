import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusquedaService } from './busqueda.service';

@ApiTags('Búsqueda')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('busqueda')
export class BusquedaController {
  constructor(private readonly busquedaService: BusquedaService) {}

  @Get()
  @ApiOperation({ summary: 'Búsqueda global: camiones, clientes y pallets' })
  @ApiQuery({ name: 'q', description: 'Término de búsqueda (mínimo 2 caracteres)' })
  buscar(@Query('q') q: string) {
    return this.busquedaService.buscar(q ?? '');
  }
}
