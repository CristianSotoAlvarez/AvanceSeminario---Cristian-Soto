import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QrService } from './qr.service';

@ApiTags('QR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Get('camion/:id')
  @ApiOperation({ summary: 'Genera token QR para un camión' })
  generarQrCamion(@Param('id') id: string) {
    const token = this.qrService.generarToken('camion', id);
    return { token, tipo: 'camion', entidadId: id };
  }

  @Get('pallet/:id')
  @ApiOperation({ summary: 'Genera token QR para un pallet' })
  generarQrPallet(@Param('id') id: string) {
    const token = this.qrService.generarToken('pallet', id);
    return { token, tipo: 'pallet', entidadId: id };
  }

  @Get('validar/:token')
  @ApiOperation({ summary: 'Valida un token QR y retorna la entidad referenciada' })
  validar(@Param('token') token: string) {
    return this.qrService.validarToken(token);
  }
}
