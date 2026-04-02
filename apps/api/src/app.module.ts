import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { CamionesModule } from './camiones/camiones.module';
import { AndenesModule } from './andenes/andenes.module';
import { EventosModule } from './eventos/eventos.module';
import { ReportesModule } from './reportes/reportes.module';
import { JustificacionesModule } from './justificaciones/justificaciones.module';
import { PalletsModule } from './pallets/pallets.module';
import { EntregasModule } from './entregas/entregas.module';

@Module({
  imports: [
    // Variables de entorno con validación
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting — 60 requests por minuto por IP
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),

    // Módulo global de Prisma para acceso a base de datos
    PrismaModule,

    // Autenticación JWT dual token
    AuthModule,

    // Gestión de usuarios
    UsuariosModule,

    // Gestión de camiones con máquina de estados
    CamionesModule,

    // Gestión de andenes
    AndenesModule,

    // WebSocket — eventos en tiempo real
    EventosModule,

    // KPIs y reportes operacionales
    ReportesModule,

    // Justificaciones de atraso por parada
    JustificacionesModule,

    // Gestión de pallets
    PalletsModule,

    // Entregas: agrupación de pallets por punto de expedición
    EntregasModule,
  ],
  providers: [
    // Aplicar ThrottlerGuard globalmente
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
