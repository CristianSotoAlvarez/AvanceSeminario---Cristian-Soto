import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AndenesService } from './andenes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Andenes')
@ApiBearerAuth()
@Controller('andenes')
@UseGuards(JwtAuthGuard)
export class AndenesController {
  constructor(private readonly andenesService: AndenesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los andenes con estado actual y camión asignado' })
  listar() {
    return this.andenesService.listar();
  }
}
