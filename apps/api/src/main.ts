import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

const logger = new Logger('HTTP');

function validarSecretos() {
  if (process.env.NODE_ENV !== 'production') return;

  const requeridos = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL', 'FRONTEND_URL'];
  const faltantes = requeridos.filter((clave) => !process.env[clave]);

  if (faltantes.length > 0) {
    console.error(`[FATAL] Variables de entorno requeridas no definidas: ${faltantes.join(', ')}`);
    process.exit(1);
  }

  const secretosDebiles = ['secret', 'password', '123', 'changeme', 'default'];
  for (const clave of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    const valor = process.env[clave] ?? '';
    if (valor.length < 32 || secretosDebiles.some((d) => valor.toLowerCase().includes(d))) {
      console.error(`[FATAL] ${clave} es demasiado débil para producción. Genera uno con: openssl rand -hex 32`);
      process.exit(1);
    }
  }
}

async function bootstrap() {
  validarSecretos();

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug', 'verbose'],
  });

  // Adaptador WebSocket con Socket.io
  app.useWebSocketAdapter(new IoAdapter(app));

  // Logger de peticiones HTTP
  app.use((req: Request, res: Response, next: NextFunction) => {
    const inicio = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - inicio;
      const color = res.statusCode >= 500 ? 31 : res.statusCode >= 400 ? 33 : res.statusCode >= 300 ? 36 : 32;
      logger.log(`\x1b[${color}m${res.statusCode}\x1b[0m ${req.method} ${req.url} \x1b[2m${ms}ms\x1b[0m`);
    });
    next();
  });

  // Seguridad
  app.use(helmet());
  app.use(cookieParser());

  // CORS — solo el frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Prefijo global de API
  app.setGlobalPrefix('api/v1');

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Documentación Swagger (solo en desarrollo)
  if (process.env.NODE_ENV !== 'production') {
    const configSwagger = new DocumentBuilder()
      .setTitle('DispatchTrack API')
      .setDescription('API del Sistema de Trazabilidad de Despacho — Grupo AgroIndustrial S.A.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const documento = SwaggerModule.createDocument(app, configSwagger);
    SwaggerModule.setup('docs', app, documento);
  }

  const puerto = process.env.PORT || 3001;
  await app.listen(puerto);
  console.log(`🚀 API corriendo en http://localhost:${puerto}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📚 Swagger en http://localhost:${puerto}/docs`);
  }
}

bootstrap();

