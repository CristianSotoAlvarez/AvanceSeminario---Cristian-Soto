import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Adaptador WebSocket con Socket.io
  app.useWebSocketAdapter(new IoAdapter(app));

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

  // Documentación Swagger
  const configSwagger = new DocumentBuilder()
    .setTitle('DispatchTrack API')
    .setDescription('API del Sistema de Trazabilidad de Despacho — Agrosuper S.A.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documento = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup('docs', app, documento);

  const puerto = process.env.PORT || 3001;
  await app.listen(puerto);
  console.log(`🚀 API corriendo en http://localhost:${puerto}`);
  console.log(`📚 Swagger en http://localhost:${puerto}/docs`);
}

bootstrap();

