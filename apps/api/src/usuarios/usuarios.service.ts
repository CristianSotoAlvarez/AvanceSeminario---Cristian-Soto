import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearUsuarioDto) {
    // Verificar unicidad de RUT y email
    const existente = await this.prisma.usuario.findFirst({
      where: { OR: [{ rut: dto.rut }, { email: dto.email }] },
    });

    if (existente) {
      throw new ConflictException('Ya existe un usuario con ese RUT o email');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        rut: dto.rut,
        email: dto.email,
        passwordHash,
        rol: dto.rol,
        edificioId: dto.edificioId,
      },
      select: {
        id: true,
        nombre: true,
        rut: true,
        email: true,
        rol: true,
        edificioId: true,
        activo: true,
        creadoEn: true,
      },
    });
  }

  async listar() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        rut: true,
        email: true,
        rol: true,
        edificioId: true,
        activo: true,
        edificio: { select: { nombre: true, tipo: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async obtenerPorId(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        rut: true,
        email: true,
        rol: true,
        edificioId: true,
        activo: true,
        edificio: { select: { nombre: true, tipo: true } },
        creadoEn: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario;
  }

  async actualizar(id: string, dto: ActualizarUsuarioDto) {
    await this.obtenerPorId(id); // Verifica que existe

    const { password, ...resto } = dto;
    const datos: any = { ...resto };

    if (password) {
      datos.passwordHash = await bcrypt.hash(password, 10);
    }

    return this.prisma.usuario.update({
      where: { id },
      data: datos,
      select: {
        id: true,
        nombre: true,
        rut: true,
        email: true,
        rol: true,
        edificioId: true,
        activo: true,
      },
    });
  }

  async desactivar(id: string) {
    await this.obtenerPorId(id);

    return this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
    });
  }
}
