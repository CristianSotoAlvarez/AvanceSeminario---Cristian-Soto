import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class QrService {
  constructor(private readonly config: ConfigService) {}

  private get secreto(): string {
    return this.config.get<string>('QR_HMAC_SECRET') ?? 'dev-secret-qr-32chars-minimum!!';
  }

  /** Genera un token HMAC firmado para un camión */
  generarToken(tipo: 'camion' | 'pallet', entidadId: string): string {
    const timestamp = Date.now();
    const payload = `${tipo}:${entidadId}:${timestamp}`;
    const firma = crypto.createHmac('sha256', this.secreto).update(payload).digest('hex');
    return Buffer.from(`${payload}|${firma}`).toString('base64url');
  }

  /** Valida el token y retorna { tipo, entidadId } */
  validarToken(token: string): { tipo: string; entidadId: string; timestamp: number } {
    let decoded: string;
    try {
      decoded = Buffer.from(token, 'base64url').toString('utf-8');
    } catch {
      throw new UnauthorizedException('Token QR inválido');
    }

    const separador = decoded.lastIndexOf('|');
    if (separador === -1) throw new UnauthorizedException('Token QR malformado');

    const payload = decoded.slice(0, separador);
    const firmaRecibida = decoded.slice(separador + 1);
    const firmaEsperada = crypto.createHmac('sha256', this.secreto).update(payload).digest('hex');

    // timingSafeEqual lanza RangeError si los búferes difieren en longitud, y este
    // token llega por un endpoint público: comparar longitudes antes evita un 500.
    const bufRecibida = Buffer.from(firmaRecibida, 'utf-8');
    const bufEsperada = Buffer.from(firmaEsperada, 'utf-8');
    if (bufRecibida.length !== bufEsperada.length || !crypto.timingSafeEqual(bufRecibida, bufEsperada)) {
      throw new UnauthorizedException('Token QR con firma inválida');
    }

    const partes = payload.split(':');
    if (partes.length < 3) throw new UnauthorizedException('Token QR malformado');

    const [tipo, entidadId, tsStr] = partes;
    const timestamp = parseInt(tsStr);
    if (!Number.isFinite(timestamp)) throw new UnauthorizedException('Token QR malformado');

    // Token válido por 24 horas
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      throw new UnauthorizedException('Token QR expirado');
    }

    return { tipo, entidadId, timestamp };
  }
}
