import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QrService } from './qr.service';

/** ConfigService mínimo con un secreto fijo para pruebas. */
function crearServicio(secreto = 'secreto-de-pruebas-con-32-caracteres!'): QrService {
  const config = { get: () => secreto } as unknown as ConfigService;
  return new QrService(config);
}

describe('QrService', () => {
  describe('ida y vuelta', () => {
    it('valida un token recién generado y devuelve tipo y entidad', () => {
      const servicio = crearServicio();
      const token = servicio.generarToken('camion', 'cam-123');

      const resultado = servicio.validarToken(token);

      expect(resultado.tipo).toBe('camion');
      expect(resultado.entidadId).toBe('cam-123');
    });
  });

  describe('firmas inválidas', () => {
    it('rechaza un token firmado con otro secreto', () => {
      const token = crearServicio('secreto-A-con-32-caracteres-largos!!').generarToken('camion', 'cam-1');
      const otroServicio = crearServicio('secreto-B-con-32-caracteres-largos!!');

      expect(() => otroServicio.validarToken(token)).toThrow(UnauthorizedException);
    });

    // Regresión: timingSafeEqual lanza RangeError si los búferes difieren en
    // longitud. Como el token llega por un endpoint público, eso devolvía 500.
    it('rechaza con 401 (no 500) una firma de longitud distinta', () => {
      const servicio = crearServicio();
      const token = servicio.generarToken('camion', 'cam-1');
      const plano = Buffer.from(token, 'base64url').toString('utf-8');
      const payload = plano.slice(0, plano.lastIndexOf('|'));
      const truncado = Buffer.from(`${payload}|abc`).toString('base64url');

      expect(() => servicio.validarToken(truncado)).toThrow(UnauthorizedException);
    });

    it('rechaza un token sin separador de firma', () => {
      const servicio = crearServicio();
      const basura = Buffer.from('camion:cam-1:123').toString('base64url');

      expect(() => servicio.validarToken(basura)).toThrow(UnauthorizedException);
    });
  });

  describe('expiración', () => {
    it('rechaza un token de hace más de 24 horas', () => {
      const servicio = crearServicio();
      const hace25Horas = Date.now() - 25 * 60 * 60 * 1000;
      const espia = jest.spyOn(Date, 'now').mockReturnValue(hace25Horas);
      const token = servicio.generarToken('camion', 'cam-1');
      espia.mockRestore();

      expect(() => servicio.validarToken(token)).toThrow(UnauthorizedException);
    });

    // Regresión: un timestamp no numérico daba NaN, la resta daba NaN y la
    // comparación de expiración era false, de modo que el token pasaba.
    it('rechaza un token cuyo timestamp no es numérico', () => {
      const servicio = crearServicio();
      const payload = 'camion:cam-1:no-es-fecha';
      const crypto = require('crypto');
      const firma = crypto
        .createHmac('sha256', 'secreto-de-pruebas-con-32-caracteres!')
        .update(payload)
        .digest('hex');
      const token = Buffer.from(`${payload}|${firma}`).toString('base64url');

      expect(() => servicio.validarToken(token)).toThrow(UnauthorizedException);
    });
  });
});
