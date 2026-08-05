import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** Autentica usuario por RUT/email y contraseña */
  async login(identificador: string, password: string, ip?: string) {
    // Buscar por RUT o email
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        OR: [
          { rut: identificador },
          { email: identificador },
        ],
        activo: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValido = await bcrypt.compare(password, usuario.passwordHash);

    if (!passwordValido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.prisma.auditLog.create({
      data: {
        usuarioId: usuario.id,
        accion: 'LOGIN',
        entidadTipo: 'Usuario',
        entidadId: usuario.id,
        ip: ip ?? null,
      },
    });

    return this.generarTokens(usuario);
  }

  /** Renueva access token usando el refresh token */
  async refrescarToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const usuario = await this.prisma.usuario.findUnique({
        where: { id: payload.sub, activo: true },
      });

      if (!usuario) {
        throw new UnauthorizedException('Usuario no válido');
      }

      return this.generarTokens(usuario);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  /** Genera par de tokens (access + refresh) */
  private generarTokens(usuario: { id: string; nombre: string; email: string; rol: string; polivalente?: boolean; edificioId: string | null }) {
    const polivalente = usuario.polivalente ?? false;
    const payload = {
      sub: usuario.id,
      rol: usuario.rol,
      polivalente,
      edificioId: usuario.edificioId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
    });

    return {
      accessToken,
      refreshToken,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        polivalente,
        edificioId: usuario.edificioId,
      },
    };
  }
}
