import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decoradores/roles.decorator';
import { UsuarioActual } from '../auth/decoradores/usuario-actual.decorator';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @Roles('JEFE_DESPACHO')
  @ApiOperation({ summary: 'Crear un nuevo usuario (solo Jefe de Despacho)' })
  crear(@Body() dto: CrearUsuarioDto, @UsuarioActual('id') actorId: string) {
    return this.usuariosService.crear(dto, actorId);
  }

  @Get()
  @Roles('JEFE_DESPACHO', 'COORDINADOR')
  @ApiOperation({ summary: 'Listar todos los usuarios' })
  listar() {
    return this.usuariosService.listar();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  obtenerPorId(@Param('id') id: string) {
    return this.usuariosService.obtenerPorId(id);
  }

  @Patch(':id')
  @Roles('JEFE_DESPACHO')
  @ApiOperation({ summary: 'Actualizar usuario' })
  actualizar(@Param('id') id: string, @Body() dto: ActualizarUsuarioDto, @UsuarioActual('id') actorId: string) {
    return this.usuariosService.actualizar(id, dto, actorId);
  }

  @Delete(':id')
  @Roles('JEFE_DESPACHO')
  @ApiOperation({ summary: 'Desactivar usuario (soft delete)' })
  desactivar(@Param('id') id: string, @UsuarioActual('id') actorId: string) {
    return this.usuariosService.desactivar(id, actorId);
  }
}
