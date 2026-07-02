import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PalletsService } from './pallets.service';
import { CrearPalletDto } from './dto/crear-pallet.dto';
import { AgregarProductoDto } from './dto/agregar-producto.dto';
import { CambiarEstadoPalletDto } from './dto/cambiar-estado-pallet.dto';
import { FiltrosPalletDto } from './dto/filtros-pallet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decoradores/roles.decorator';
import { UsuarioActual } from '../auth/decoradores/usuario-actual.decorator';

@ApiTags('Pallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pallets')
export class PalletsController {
  constructor(private readonly palletsService: PalletsService) {}

  @Get()
  listar(@Query() filtros: FiltrosPalletDto) {
    return this.palletsService.listar(filtros);
  }

  @Get(':id')
  obtenerPorId(@Param('id') id: string) {
    return this.palletsService.obtenerPorId(id);
  }

  /**
   * Crear pallet (acción de PICKING).
   * Permitido para: PICKINERO; CARGADOR polivalente; roles de gestión.
   */
  @Post()
  @Roles('PICKINERO', 'CARGADOR', 'JEFE_DESPACHO', 'SUPERVISOR', 'COORDINADOR')
  crear(
    @Body() dto: CrearPalletDto,
    @UsuarioActual() usuario: { id: string; rol: string; polivalente?: boolean },
  ) {
    validarPuedePickear(usuario);
    return this.palletsService.crear(dto, usuario.id);
  }

  @Post(':id/productos')
  @Roles('PICKINERO', 'CARGADOR', 'JEFE_DESPACHO', 'SUPERVISOR', 'COORDINADOR')
  agregarProducto(
    @Param('id') palletId: string,
    @Body() dto: AgregarProductoDto,
    @UsuarioActual() usuario: { id: string; rol: string; polivalente?: boolean },
  ) {
    validarPuedePickear(usuario);
    return this.palletsService.agregarProducto(palletId, dto);
  }

  @Patch(':id/items/:productoId')
  @Roles('PICKINERO', 'CARGADOR', 'JEFE_DESPACHO', 'SUPERVISOR', 'COORDINADOR')
  setItemPallet(
    @Param('id') palletId: string,
    @Param('productoId') productoId: string,
    @Body() body: { cantidad: number },
    @UsuarioActual() usuario: { id: string; rol: string; polivalente?: boolean },
  ) {
    validarPuedePickear(usuario);
    return this.palletsService.setItemPallet(palletId, productoId, body.cantidad);
  }

  @Post(':id/cerrar-y-crear-nuevo')
  @Roles('PICKINERO', 'CARGADOR', 'JEFE_DESPACHO', 'SUPERVISOR', 'COORDINADOR')
  cerrarYCrearNuevo(
    @Param('id') palletId: string,
    @UsuarioActual() usuario: { id: string; rol: string; polivalente?: boolean },
  ) {
    validarPuedePickear(usuario);
    return this.palletsService.cerrarYCrearNuevo(palletId, usuario.id);
  }

  /**
   * Cambia el estado del pallet. Valida:
   *  - ARMADO  → solo el pickinero que lo creó (o polivalente que cumpla); también jefes.
   *  - CARGADO → CARGADOR; PICKINERO polivalente; también jefes.
   *  - VERIFICADO → solo gestión (JEFE_DESPACHO/SUPERVISOR/COORDINADOR).
   */
  @Patch(':id/estado')
  @Roles('PICKINERO', 'CARGADOR', 'JEFE_DESPACHO', 'SUPERVISOR', 'COORDINADOR')
  cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoPalletDto,
    @UsuarioActual() usuario: { id: string; rol: string; polivalente?: boolean },
  ) {
    if (dto.estado === 'VERIFICADO') {
      if (!ROLES_GESTION.includes(usuario.rol)) {
        throw new ForbiddenException('Solo Jefe de Despacho, Supervisor o Coordinador pueden verificar pallets');
      }
    } else if (dto.estado === 'ARMADO') {
      if (!puedePickear(usuario)) {
        throw new ForbiddenException('Solo PICKINERO (o CARGADOR polivalente) puede cerrar un pallet armado');
      }
    } else if (dto.estado === 'CARGADO') {
      if (!puedeCargar(usuario)) {
        throw new ForbiddenException('Solo CARGADOR (o PICKINERO polivalente) puede marcar un pallet como cargado');
      }
    }
    return this.palletsService.cambiarEstado(id, dto.estado, usuario.id);
  }
}

// ─── Helpers de autorización ────────────────────────────────────────────────

const ROLES_GESTION = ['JEFE_DESPACHO', 'SUPERVISOR', 'COORDINADOR'];

function puedePickear(usuario: { rol: string; polivalente?: boolean }): boolean {
  if (ROLES_GESTION.includes(usuario.rol)) return true;
  if (usuario.rol === 'PICKINERO') return true;
  if (usuario.rol === 'CARGADOR' && usuario.polivalente) return true;
  return false;
}

function puedeCargar(usuario: { rol: string; polivalente?: boolean }): boolean {
  if (ROLES_GESTION.includes(usuario.rol)) return true;
  if (usuario.rol === 'CARGADOR') return true;
  if (usuario.rol === 'PICKINERO' && usuario.polivalente) return true;
  return false;
}

function validarPuedePickear(usuario: { rol: string; polivalente?: boolean }) {
  if (!puedePickear(usuario)) {
    throw new ForbiddenException('Solo PICKINERO (o CARGADOR polivalente) puede armar pallets');
  }
}
