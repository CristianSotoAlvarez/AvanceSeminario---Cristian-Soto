import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/eventos',
})
export class EventosGateway {
  @WebSocketServer()
  private server: Server;

  emitirCamionActualizado(camion: Record<string, unknown>) {
    this.server.emit('camion:actualizado', camion);
  }

  emitirAndenesActualizados() {
    this.server.emit('andenes:actualizados');
  }
}
