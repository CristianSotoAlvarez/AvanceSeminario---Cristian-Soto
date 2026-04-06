import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/eventos',
})
export class EventosGateway implements OnGatewayInit {
  @WebSocketServer()
  private servidor: Server;

  private readonly logger = new Logger(EventosGateway.name);

  async afterInit(servidor: Server) {
    const urlRedis = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      // Crear cliente publicador y suscriptor para el adapter
      const clientePublicador = createClient({ url: urlRedis });
      const clienteSuscriptor = clientePublicador.duplicate();

      // Conectar ambos clientes antes de configurar el adapter
      await Promise.all([
        clientePublicador.connect(),
        clienteSuscriptor.connect(),
      ]);

      // Configurar el adapter Redis en el servidor raíz (no en el namespace)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (servidor as any).server.adapter(createAdapter(clientePublicador, clienteSuscriptor));

      this.logger.log(`Adapter Redis configurado correctamente (${urlRedis})`);

      // Manejar errores en los clientes una vez conectados
      clientePublicador.on('error', (error: Error) => {
        this.logger.warn(`Error en cliente Redis publicador: ${error.message}`);
      });
      clienteSuscriptor.on('error', (error: Error) => {
        this.logger.warn(
          `Error en cliente Redis suscriptor: ${error.message}`,
        );
      });
    } catch (error) {
      // Degradación elegante: si Redis no está disponible, continuar sin adapter
      const mensaje =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.warn(
        `No se pudo conectar a Redis (${urlRedis}): ${mensaje}. ` +
          `El gateway continuará sin adapter Redis (modo instancia única).`,
      );
    }
  }

  emitirCamionActualizado(camion: Record<string, unknown>) {
    this.servidor.emit('camion:actualizado', camion);
  }

  emitirAndenesActualizados() {
    this.servidor.emit('andenes:actualizados');
  }
}
