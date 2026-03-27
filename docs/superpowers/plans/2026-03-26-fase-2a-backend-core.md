# Fase 2A: Backend Core — NestJS + Prisma + Auth + Camiones

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el backend NestJS con Prisma, autenticación JWT dual token, RBAC, y el módulo de camiones con máquina de estados — la base funcional sobre la que se construyen todos los módulos.

**Architecture:** NestJS modular con patrón Controlador → Servicio → Prisma. Autenticación JWT dual token (access 15min en memoria, refresh 7d HttpOnly cookie). Guards para roles y edificio. Prisma como ORM contra PostgreSQL 16. Redis para sesiones y futura Pub/Sub.

**Tech Stack:** NestJS 10, Prisma 6, PostgreSQL 16, Redis 7, bcrypt, passport-jwt, class-validator, class-transformer, helmet, @nestjs/throttler, @nestjs/swagger

**Spec de referencia:** `C:\Users\crist\Desktop\Seminario-Titulo\DispatchTrack-Diseño-Sistema.html`

**Nota idioma:** Todo el código (variables, comentarios, commits) debe estar en español. Excepciones: nombres técnicos estándar de NestJS/Prisma (Controller, Service, Module, Guard, etc.).

---

## Estructura de Archivos

```
apps/api/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── .env.example
├── src/
│   ├── main.ts                          ← Bootstrap NestJS + Swagger + CORS
│   ├── app.module.ts                    ← Módulo raíz
│   ├── prisma/
│   │   ├── prisma.module.ts             ← Módulo Prisma global
│   │   ├── prisma.service.ts            ← Servicio Prisma con onModuleInit
│   │   └── schema.prisma               ← Schema completo de BD
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts           ← POST login, refresh, logout, GET me
│   │   ├── auth.service.ts              ← Lógica de tokens y sesiones
│   │   ├── estrategias/
│   │   │   └── jwt.strategy.ts          ← Passport JWT strategy
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts        ← Guard de autenticación
│   │   │   └── roles.guard.ts           ← Guard de roles (RBAC)
│   │   ├── decoradores/
│   │   │   ├── roles.decorator.ts       ← @Roles() decorator
│   │   │   └── usuario-actual.decorator.ts ← @UsuarioActual() decorator
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── auth-response.dto.ts
│   ├── usuarios/
│   │   ├── usuarios.module.ts
│   │   ├── usuarios.controller.ts       ← CRUD usuarios
│   │   ├── usuarios.service.ts
│   │   └── dto/
│   │       ├── crear-usuario.dto.ts
│   │       └── actualizar-usuario.dto.ts
│   ├── camiones/
│   │   ├── camiones.module.ts
│   │   ├── camiones.controller.ts       ← CRUD + transiciones de estado
│   │   ├── camiones.service.ts          ← Máquina de estados
│   │   ├── maquina-estados.ts           ← Transiciones válidas
│   │   └── dto/
│   │       ├── crear-camion.dto.ts
│   │       ├── asignar-anden.dto.ts
│   │       └── filtros-camion.dto.ts
└── prisma/
    └── seed.ts                          ← Seed con datos iniciales
```

---

## Task 1: Scaffolding NestJS

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/tsconfig.build.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/.env.example`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`

- [ ] **Step 1: Reemplazar package.json del placeholder**

```json
// apps/api/package.json
{
  "name": "@dispatch-track/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "start:prod": "node dist/main",
    "lint": "tsc --noEmit",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@dispatch-track/types": "*",
    "@nestjs/common": "^10",
    "@nestjs/core": "^10",
    "@nestjs/platform-express": "^10",
    "@nestjs/config": "^3",
    "@nestjs/swagger": "^7",
    "@nestjs/passport": "^10",
    "@nestjs/jwt": "^10",
    "@nestjs/throttler": "^6",
    "@prisma/client": "^6",
    "passport": "^0.7",
    "passport-jwt": "^4",
    "bcrypt": "^5",
    "class-validator": "^0.14",
    "class-transformer": "^0.5",
    "helmet": "^8",
    "cookie-parser": "^1",
    "reflect-metadata": "^0.2",
    "rxjs": "^7"
  },
  "devDependencies": {
    "@nestjs/cli": "^10",
    "@nestjs/schematics": "^10",
    "@nestjs/testing": "^10",
    "@types/bcrypt": "^5",
    "@types/cookie-parser": "^1",
    "@types/express": "^5",
    "@types/passport-jwt": "^4",
    "@types/node": "^22",
    "typescript": "^5.7",
    "prisma": "^6",
    "ts-node": "^10",
    "jest": "^29",
    "ts-jest": "^29",
    "@types/jest": "^29",
    "source-map-support": "^0.5"
  },
  "prisma": {
    "schema": "src/prisma/schema.prisma",
    "seed": "ts-node prisma/seed.ts"
  }
}
```

- [ ] **Step 2: Crear tsconfig.json**

```json
// apps/api/tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2022",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*", "prisma/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Crear tsconfig.build.json**

```json
// apps/api/tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

- [ ] **Step 4: Crear nest-cli.json**

```json
// apps/api/nest-cli.json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 5: Crear .env.example**

```env
# apps/api/.env.example
# Base de datos
DATABASE_URL="postgresql://dispatch:dispatch_dev@localhost:5432/dispatch_track?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="cambiar-en-produccion-secret-largo-y-seguro"
JWT_REFRESH_SECRET="cambiar-en-produccion-refresh-secret-diferente"
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# QR
QR_HMAC_SECRET="cambiar-en-produccion-qr-hmac-secret"

# CORS
FRONTEND_URL="http://localhost:3000"

# Puerto
PORT=3001
```

- [ ] **Step 6: Crear .env copiando .env.example**

```bash
cd C:/Users/crist/Desktop/Sem_Titulo/apps/api
cp .env.example .env
```

- [ ] **Step 7: Crear main.ts**

```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
```

- [ ] **Step 8: Crear app.module.ts (por ahora solo ConfigModule)**

```typescript
// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

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
  ],
  providers: [
    // Aplicar ThrottlerGuard globalmente
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
```

- [ ] **Step 9: Instalar dependencias y verificar que NestJS arranca**

```bash
cd C:/Users/crist/Desktop/Sem_Titulo
npm install
cd apps/api
npx nest start
```

Esperado: NestJS arranca en http://localhost:3001, Swagger en http://localhost:3001/docs

- [ ] **Step 10: Commit**

```bash
cd C:/Users/crist/Desktop/Sem_Titulo
git add apps/api/
git commit -m "feat(api): scaffolding NestJS con Swagger, helmet, CORS y validación global"
```

---

## Task 2: Prisma Schema y Módulo de Base de Datos

**Files:**
- Create: `apps/api/src/prisma/schema.prisma`
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`

- [ ] **Step 1: Crear schema.prisma con todas las entidades**

```prisma
// apps/api/src/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// =====================
// ENUMS
// =====================

enum RolUsuario {
  COORDINADOR_TRANSPORTE
  COORDINADOR
  PICKINERO
  CARGADOR
  SUPERVISOR
  OPERADOR_TUNEL
  JEFE_DESPACHO
  SAG
}

enum TipoEdificio {
  AVES
  CERDO
  FRIGORIFICO
}

enum EstadoCamion {
  ESPERADO
  EN_PORTERIA
  ASIGNADO
  EN_CARGA
  EN_TUNEL_FRIO
  ESPERANDO_SAG
  APROBADO_SAG
  RECHAZADO_SAG
  LISTO
  DESPACHADO
}

enum TipoCamion {
  NACIONAL
  EXPORTACION
  INTERPLANTA
}

enum EstadoInspeccion {
  PENDIENTE
  APROBADO
  RECHAZADO
}

enum EstadoPallet {
  EN_ARMADO
  ARMADO
  CARGADO
  VERIFICADO
}

// =====================
// MODELOS
// =====================

model Usuario {
  id            String      @id @default(cuid())
  nombre        String
  rut           String      @unique
  email         String      @unique
  passwordHash  String
  rol           RolUsuario
  edificioId    String?
  edificio      Edificio?   @relation(fields: [edificioId], references: [id])
  activo        Boolean     @default(true)
  creadoEn      DateTime    @default(now())
  actualizadoEn DateTime    @updatedAt

  // Relaciones
  eventosCamion   EventoCamion[]
  palletsArmados  Pallet[]        @relation("PalletPickinero")
  palletsCargados Pallet[]        @relation("PalletCargador")
  inspecciones    InspeccionSAG[]
  eventosTunel    EventoTunel[]
  atrasos         Atraso[]
  auditorias      AuditLog[]

  @@map("usuarios")
}

model Edificio {
  id        String        @id @default(cuid())
  nombre    String
  tipo      TipoEdificio  @unique
  andenes   Anden[]
  usuarios  Usuario[]
  atrasos   Atraso[]

  @@map("edificios")
}

model Anden {
  id          String    @id @default(cuid())
  codigo      String    @unique
  edificioId  String
  edificio    Edificio  @relation(fields: [edificioId], references: [id])
  ocupado     Boolean   @default(false)
  camiones    Camion[]

  @@index([edificioId])
  @@map("andenes")
}

model Cliente {
  id          String    @id @default(cuid())
  nombre      String
  rut         String    @unique
  tipoDestino TipoCamion
  pedidos     Pedido[]

  @@map("clientes")
}

model Pedido {
  id            String    @id @default(cuid())
  numero        String    @unique
  clienteId     String
  cliente       Cliente   @relation(fields: [clienteId], references: [id])
  totalPallets  Int
  totalBultos   Int
  fechaEntrega  DateTime
  camiones      Camion[]
  pallets       Pallet[]

  @@map("pedidos")
}

model Camion {
  id                      String        @id @default(cuid())
  patente                 String
  tipo                    TipoCamion
  estado                  EstadoCamion  @default(ESPERADO)
  pedidoId                String?
  pedido                  Pedido?       @relation(fields: [pedidoId], references: [id])
  andenId                 String?
  anden                   Anden?        @relation(fields: [andenId], references: [id])
  horaLlegadaPlanificada  DateTime
  horaSalidaPlanificada   DateTime?
  horaLlegadaReal         DateTime?
  horaSalidaReal          DateTime?
  cargaPreviaDescripcion  String?
  creadoEn                DateTime      @default(now())
  actualizadoEn           DateTime      @updatedAt

  // Relaciones
  eventos       EventoCamion[]
  pallets       Pallet[]
  inspecciones  InspeccionSAG[]
  eventosTunel  EventoTunel[]
  atrasos       Atraso[]

  @@index([estado])
  @@index([tipo])
  @@index([andenId])
  @@map("camiones")
}

/// Registro inmutable (append-only) de cada cambio de estado
model EventoCamion {
  id          String        @id @default(cuid())
  camionId    String
  camion      Camion        @relation(fields: [camionId], references: [id])
  estado      EstadoCamion
  timestamp   DateTime      @default(now())
  usuarioId   String?
  usuario     Usuario?      @relation(fields: [usuarioId], references: [id])
  nota        String?

  @@index([camionId])
  @@index([timestamp])
  @@map("eventos_camion")
}

model Pallet {
  id                  String        @id @default(cuid())
  codigoUnico         String        @unique
  camionId            String?
  camion              Camion?       @relation(fields: [camionId], references: [id])
  pedidoId            String?
  pedido              Pedido?       @relation(fields: [pedidoId], references: [id])
  pickineroId         String?
  pickinero           Usuario?      @relation("PalletPickinero", fields: [pickineroId], references: [id])
  cargadorId          String?
  cargador            Usuario?      @relation("PalletCargador", fields: [cargadorId], references: [id])
  edificioId          String?
  estado              EstadoPallet  @default(EN_ARMADO)
  timestampInicio     DateTime      @default(now())
  timestampFin        DateTime?
  tiempoArmadoSegundos Int?
  productos           ProductoPallet[]

  @@index([camionId])
  @@index([pedidoId])
  @@map("pallets")
}

model ProductoPallet {
  id            String  @id @default(cuid())
  palletId      String
  pallet        Pallet  @relation(fields: [palletId], references: [id], onDelete: Cascade)
  codigoBarras  String
  descripcion   String
  cantidad      Int
  pesoKg        Float
  temperatura   Float?

  @@map("productos_pallet")
}

model InspeccionSAG {
  id                    String            @id @default(cuid())
  camionId              String
  camion                Camion            @relation(fields: [camionId], references: [id])
  inspectorId           String
  inspector             Usuario           @relation(fields: [inspectorId], references: [id])
  estado                EstadoInspeccion  @default(PENDIENTE)
  timestampInicio       DateTime          @default(now())
  timestampResolucion   DateTime?
  observaciones         String?
  documentoUrl          String?

  @@index([camionId])
  @@map("inspecciones_sag")
}

model EventoTunel {
  id                    String    @id @default(cuid())
  camionId              String
  camion                Camion    @relation(fields: [camionId], references: [id])
  operadorId            String
  operador              Usuario   @relation(fields: [operadorId], references: [id])
  temperaturaRegistrada Float
  timestamp             DateTime  @default(now())
  observaciones         String?

  @@map("eventos_tunel")
}

model Atraso {
  id              String    @id @default(cuid())
  camionId        String
  camion          Camion    @relation(fields: [camionId], references: [id])
  edificioId      String
  edificio        Edificio  @relation(fields: [edificioId], references: [id])
  motivoCodigo    String
  motivoDetalle   String?
  minutosAtraso   Int
  registradoPor   String
  registrador     Usuario   @relation(fields: [registradoPor], references: [id])
  timestamp       DateTime  @default(now())

  @@index([camionId])
  @@map("atrasos")
}

model AuditLog {
  id          String    @id @default(cuid())
  usuarioId   String?
  usuario     Usuario?  @relation(fields: [usuarioId], references: [id])
  accion      String
  entidadTipo String
  entidadId   String
  payload     Json?
  ip          String?
  timestamp   DateTime  @default(now())

  @@index([entidadTipo, entidadId])
  @@index([timestamp])
  @@map("audit_log")
}
```

- [ ] **Step 2: Crear PrismaService**

```typescript
// apps/api/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 3: Crear PrismaModule (global)**

```typescript
// apps/api/src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 4: Agregar PrismaModule a AppModule**

Modificar `apps/api/src/app.module.ts`:

```typescript
// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    PrismaModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
```

- [ ] **Step 5: Generar cliente Prisma y ejecutar primera migración**

Requiere que Docker esté corriendo con PostgreSQL:

```bash
cd C:/Users/crist/Desktop/Sem_Titulo
docker compose up -d
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
```

Esperado: Migración creada, tablas generadas en PostgreSQL.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/crist/Desktop/Sem_Titulo
git add apps/api/src/prisma/ apps/api/src/app.module.ts
git commit -m "feat(api): agregar schema Prisma completo con todas las entidades y migración inicial"
```

---

## Task 3: Módulo de Autenticación — JWT Dual Token

**Files:**
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/estrategias/jwt.strategy.ts`
- Create: `apps/api/src/auth/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/auth/guards/roles.guard.ts`
- Create: `apps/api/src/auth/decoradores/roles.decorator.ts`
- Create: `apps/api/src/auth/decoradores/usuario-actual.decorator.ts`
- Create: `apps/api/src/auth/dto/login.dto.ts`
- Create: `apps/api/src/auth/dto/auth-response.dto.ts`

- [ ] **Step 1: Crear DTOs de autenticación**

```typescript
// apps/api/src/auth/dto/login.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '12.345.678-9', description: 'RUT o email del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'El identificador es obligatorio' })
  identificador: string;

  @ApiProperty({ example: 'clave123', description: 'Contraseña del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;
}
```

```typescript
// apps/api/src/auth/dto/auth-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  usuario: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
    edificioId: string | null;
  };
}
```

- [ ] **Step 2: Crear decoradores personalizados**

```typescript
// apps/api/src/auth/decoradores/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Decorador para restringir acceso a roles específicos */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
// apps/api/src/auth/decoradores/usuario-actual.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Extrae el usuario actual del request (inyectado por JwtAuthGuard) */
export const UsuarioActual = createParamDecorator(
  (campo: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const usuario = request.user;

    if (campo) {
      return usuario?.[campo];
    }

    return usuario;
  },
);
```

- [ ] **Step 3: Crear JWT Strategy (Passport)**

```typescript
// apps/api/src/auth/estrategias/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  rol: string;
  edificioId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        edificioId: true,
        activo: true,
      },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario no válido o desactivado');
    }

    return usuario;
  }
}
```

- [ ] **Step 4: Crear Guards**

```typescript
// apps/api/src/auth/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

```typescript
// apps/api/src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decoradores/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    // Si no hay roles definidos, permitir acceso
    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    const { user } = ctx.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    const tieneRol = rolesRequeridos.includes(user.rol);

    if (!tieneRol) {
      throw new ForbiddenException(
        `Rol '${user.rol}' no tiene permiso. Se requiere: ${rolesRequeridos.join(', ')}`,
      );
    }

    return true;
  }
}
```

- [ ] **Step 5: Crear AuthService**

```typescript
// apps/api/src/auth/auth.service.ts
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
  async login(identificador: string, password: string) {
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
  private generarTokens(usuario: { id: string; nombre: string; email: string; rol: string; edificioId: string | null }) {
    const payload = {
      sub: usuario.id,
      rol: usuario.rol,
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
        edificioId: usuario.edificioId,
      },
    };
  }
}
```

- [ ] **Step 6: Crear AuthController**

```typescript
// apps/api/src/auth/auth.controller.ts
import { Controller, Post, Body, Get, Req, Res, UseGuards, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsuarioActual } from './decoradores/usuario-actual.decorator';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con RUT/email y contraseña' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.authService.login(dto.identificador, dto.password);

    // Refresh token como cookie HttpOnly
    res.cookie('refresh_token', resultado.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/api/v1/auth',
    });

    return {
      accessToken: resultado.accessToken,
      usuario: resultado.usuario,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token con refresh token (cookie)' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedException('No se encontró refresh token');
    }

    const resultado = await this.authService.refrescarToken(refreshToken);

    // Renovar cookie del refresh token
    res.cookie('refresh_token', resultado.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    return {
      accessToken: resultado.accessToken,
      usuario: resultado.usuario,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión (limpia cookie de refresh)' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });
    return { mensaje: 'Sesión cerrada correctamente' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  me(@UsuarioActual() usuario: any) {
    return usuario;
  }
}
```

- [ ] **Step 7: Crear AuthModule**

```typescript
// apps/api/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './estrategias/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 8: Registrar AuthModule en AppModule**

Agregar a los imports de `apps/api/src/app.module.ts`:

```typescript
import { AuthModule } from './auth/auth.module';

// En imports array:
AuthModule,
```

- [ ] **Step 9: Verificar que la API arranca con el módulo de auth**

```bash
cd C:/Users/crist/Desktop/Sem_Titulo/apps/api
npx nest start
```

Esperado: API arranca sin errores, Swagger muestra endpoints de `/auth/*`

- [ ] **Step 10: Commit**

```bash
cd C:/Users/crist/Desktop/Sem_Titulo
git add apps/api/src/auth/ apps/api/src/app.module.ts
git commit -m "feat(api): agregar módulo de autenticación JWT dual token con RBAC"
```

---

## Task 4: Módulo de Usuarios

**Files:**
- Create: `apps/api/src/usuarios/usuarios.module.ts`
- Create: `apps/api/src/usuarios/usuarios.controller.ts`
- Create: `apps/api/src/usuarios/usuarios.service.ts`
- Create: `apps/api/src/usuarios/dto/crear-usuario.dto.ts`
- Create: `apps/api/src/usuarios/dto/actualizar-usuario.dto.ts`

- [ ] **Step 1: Crear DTOs de usuario**

```typescript
// apps/api/src/usuarios/dto/crear-usuario.dto.ts
import { IsString, IsEmail, IsEnum, IsOptional, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';

export class CrearUsuarioDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @ApiProperty({ example: '12.345.678-9' })
  @IsString()
  @IsNotEmpty({ message: 'El RUT es obligatorio' })
  rut: string;

  @ApiProperty({ example: 'juan.perez@agrosuper.cl' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ example: 'clave123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({ enum: RolUsuario, example: 'CARGADOR' })
  @IsEnum(RolUsuario, { message: 'Rol inválido' })
  rol: RolUsuario;

  @ApiPropertyOptional({ description: 'ID del edificio asignado (obligatorio para roles por edificio)' })
  @IsString()
  @IsOptional()
  edificioId?: string;
}
```

```typescript
// apps/api/src/usuarios/dto/actualizar-usuario.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CrearUsuarioDto } from './crear-usuario.dto';

export class ActualizarUsuarioDto extends PartialType(
  OmitType(CrearUsuarioDto, ['rut'] as const),
) {}
```

- [ ] **Step 2: Crear UsuariosService**

```typescript
// apps/api/src/usuarios/usuarios.service.ts
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

    const datos: any = { ...dto };

    if (dto.password) {
      datos.passwordHash = await bcrypt.hash(dto.password, 10);
      delete datos.password;
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
```

- [ ] **Step 3: Crear UsuariosController**

```typescript
// apps/api/src/usuarios/usuarios.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decoradores/roles.decorator';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @Roles('JEFE_DESPACHO')
  @ApiOperation({ summary: 'Crear un nuevo usuario (solo Jefe de Despacho)' })
  crear(@Body() dto: CrearUsuarioDto) {
    return this.usuariosService.crear(dto);
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
  actualizar(@Param('id') id: string, @Body() dto: ActualizarUsuarioDto) {
    return this.usuariosService.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles('JEFE_DESPACHO')
  @ApiOperation({ summary: 'Desactivar usuario (soft delete)' })
  desactivar(@Param('id') id: string) {
    return this.usuariosService.desactivar(id);
  }
}
```

- [ ] **Step 4: Crear UsuariosModule y registrar en AppModule**

```typescript
// apps/api/src/usuarios/usuarios.module.ts
import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
```

Agregar a `app.module.ts`:
```typescript
import { UsuariosModule } from './usuarios/usuarios.module';
// En imports: UsuariosModule,
```

- [ ] **Step 5: Verificar en Swagger**

```bash
cd C:/Users/crist/Desktop/Sem_Titulo/apps/api
npx nest start
```

Esperado: Swagger muestra endpoints `/usuarios/*` con schemas de DTOs.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/crist/Desktop/Sem_Titulo
git add apps/api/src/usuarios/ apps/api/src/app.module.ts
git commit -m "feat(api): agregar módulo de usuarios con CRUD y control de acceso por roles"
```

---

## Task 5: Módulo de Camiones con Máquina de Estados

**Files:**
- Create: `apps/api/src/camiones/maquina-estados.ts`
- Create: `apps/api/src/camiones/dto/crear-camion.dto.ts`
- Create: `apps/api/src/camiones/dto/asignar-anden.dto.ts`
- Create: `apps/api/src/camiones/dto/filtros-camion.dto.ts`
- Create: `apps/api/src/camiones/camiones.service.ts`
- Create: `apps/api/src/camiones/camiones.controller.ts`
- Create: `apps/api/src/camiones/camiones.module.ts`

- [ ] **Step 1: Crear máquina de estados**

```typescript
// apps/api/src/camiones/maquina-estados.ts
import { EstadoCamion, TipoCamion } from '@prisma/client';

/**
 * Define las transiciones válidas de estado para cada tipo de camión.
 * Clave: estado actual → Valor: estados a los que puede transicionar.
 */
const TRANSICIONES_NACIONAL: Partial<Record<EstadoCamion, EstadoCamion[]>> = {
  ESPERADO: [EstadoCamion.EN_PORTERIA],
  EN_PORTERIA: [EstadoCamion.ASIGNADO],
  ASIGNADO: [EstadoCamion.EN_CARGA],
  EN_CARGA: [EstadoCamion.LISTO],
  LISTO: [EstadoCamion.DESPACHADO],
};

const TRANSICIONES_EXPORTACION: Partial<Record<EstadoCamion, EstadoCamion[]>> = {
  ESPERADO: [EstadoCamion.EN_PORTERIA],
  EN_PORTERIA: [EstadoCamion.ASIGNADO],
  ASIGNADO: [EstadoCamion.EN_CARGA],
  EN_CARGA: [EstadoCamion.EN_TUNEL_FRIO],
  EN_TUNEL_FRIO: [EstadoCamion.ESPERANDO_SAG],
  ESPERANDO_SAG: [EstadoCamion.APROBADO_SAG, EstadoCamion.RECHAZADO_SAG],
  APROBADO_SAG: [EstadoCamion.LISTO],
  RECHAZADO_SAG: [EstadoCamion.ESPERANDO_SAG], // Re-inspección tras corrección
  LISTO: [EstadoCamion.DESPACHADO],
};

const TRANSICIONES_INTERPLANTA = TRANSICIONES_NACIONAL;

const MAPA_TRANSICIONES: Record<TipoCamion, Partial<Record<EstadoCamion, EstadoCamion[]>>> = {
  NACIONAL: TRANSICIONES_NACIONAL,
  EXPORTACION: TRANSICIONES_EXPORTACION,
  INTERPLANTA: TRANSICIONES_INTERPLANTA,
};

/** Verifica si una transición de estado es válida para el tipo de camión */
export function esTransicionValida(
  tipoCamion: TipoCamion,
  estadoActual: EstadoCamion,
  nuevoEstado: EstadoCamion,
): boolean {
  const transiciones = MAPA_TRANSICIONES[tipoCamion];
  const estadosPermitidos = transiciones[estadoActual];

  if (!estadosPermitidos) return false;

  return estadosPermitidos.includes(nuevoEstado);
}

/** Obtiene los estados siguientes válidos para un camión */
export function obtenerEstadosSiguientes(
  tipoCamion: TipoCamion,
  estadoActual: EstadoCamion,
): EstadoCamion[] {
  const transiciones = MAPA_TRANSICIONES[tipoCamion];
  return transiciones[estadoActual] || [];
}
```

- [ ] **Step 2: Crear DTOs de camiones**

```typescript
// apps/api/src/camiones/dto/crear-camion.dto.ts
import { IsString, IsEnum, IsDateString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoCamion } from '@prisma/client';

export class CrearCamionDto {
  @ApiProperty({ example: 'BXRK-42', description: 'Patente del camión' })
  @IsString()
  @IsNotEmpty({ message: 'La patente es obligatoria' })
  patente: string;

  @ApiProperty({ enum: TipoCamion, example: 'NACIONAL' })
  @IsEnum(TipoCamion, { message: 'Tipo de camión inválido' })
  tipo: TipoCamion;

  @ApiProperty({ example: '2026-03-26T08:30:00Z' })
  @IsDateString({}, { message: 'Fecha de llegada planificada inválida' })
  horaLlegadaPlanificada: string;

  @ApiPropertyOptional({ example: '2026-03-26T12:00:00Z' })
  @IsDateString({}, { message: 'Fecha de salida planificada inválida' })
  @IsOptional()
  horaSalidaPlanificada?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pedidoId?: string;

  @ApiPropertyOptional({ description: 'Descripción de carga previa (solo INTERPLANTA)' })
  @IsString()
  @IsOptional()
  cargaPreviaDescripcion?: string;
}
```

```typescript
// apps/api/src/camiones/dto/asignar-anden.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AsignarAndenDto {
  @ApiProperty({ description: 'ID del andén a asignar' })
  @IsString()
  @IsNotEmpty({ message: 'El ID del andén es obligatorio' })
  andenId: string;
}
```

```typescript
// apps/api/src/camiones/dto/filtros-camion.dto.ts
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoCamion, TipoCamion } from '@prisma/client';

export class FiltrosCamionDto {
  @ApiPropertyOptional({ enum: EstadoCamion })
  @IsEnum(EstadoCamion)
  @IsOptional()
  estado?: EstadoCamion;

  @ApiPropertyOptional({ enum: TipoCamion })
  @IsEnum(TipoCamion)
  @IsOptional()
  tipo?: TipoCamion;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  edificioId?: string;
}
```

- [ ] **Step 3: Crear CamionesService**

```typescript
// apps/api/src/camiones/camiones.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EstadoCamion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrearCamionDto } from './dto/crear-camion.dto';
import { FiltrosCamionDto } from './dto/filtros-camion.dto';
import { esTransicionValida, obtenerEstadosSiguientes } from './maquina-estados';

@Injectable()
export class CamionesService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearCamionDto) {
    return this.prisma.camion.create({
      data: {
        patente: dto.patente,
        tipo: dto.tipo,
        horaLlegadaPlanificada: new Date(dto.horaLlegadaPlanificada),
        horaSalidaPlanificada: dto.horaSalidaPlanificada ? new Date(dto.horaSalidaPlanificada) : null,
        pedidoId: dto.pedidoId,
        cargaPreviaDescripcion: dto.cargaPreviaDescripcion,
      },
      include: {
        anden: true,
        pedido: { include: { cliente: true } },
      },
    });
  }

  async listar(filtros: FiltrosCamionDto) {
    const where: any = {};

    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.tipo) where.tipo = filtros.tipo;
    if (filtros.edificioId) {
      where.anden = { edificioId: filtros.edificioId };
    }

    return this.prisma.camion.findMany({
      where,
      include: {
        anden: true,
        pedido: { include: { cliente: true } },
      },
      orderBy: { horaLlegadaPlanificada: 'asc' },
    });
  }

  async obtenerPorId(id: string) {
    const camion = await this.prisma.camion.findUnique({
      where: { id },
      include: {
        anden: true,
        pedido: { include: { cliente: true } },
        eventos: {
          orderBy: { timestamp: 'asc' },
          include: { usuario: { select: { nombre: true, rol: true } } },
        },
        pallets: true,
      },
    });

    if (!camion) {
      throw new NotFoundException('Camión no encontrado');
    }

    // Agregar estados siguientes posibles
    const estadosSiguientes = obtenerEstadosSiguientes(camion.tipo, camion.estado);

    return { ...camion, estadosSiguientes };
  }

  /** Asigna un andén al camión (transición EN_PORTERIA → ASIGNADO) */
  async asignarAnden(camionId: string, andenId: string, usuarioId: string) {
    const camion = await this.obtenerCamionOError(camionId);

    this.validarTransicion(camion, EstadoCamion.ASIGNADO);

    // Verificar que el andén existe y no está ocupado
    const anden = await this.prisma.anden.findUnique({ where: { id: andenId } });
    if (!anden) throw new NotFoundException('Andén no encontrado');
    if (anden.ocupado) throw new BadRequestException(`El andén ${anden.codigo} ya está ocupado`);

    // Transacción: actualizar camión + marcar andén ocupado + crear evento
    return this.prisma.$transaction(async (tx) => {
      const camionActualizado = await tx.camion.update({
        where: { id: camionId },
        data: { estado: EstadoCamion.ASIGNADO, andenId },
        include: { anden: true },
      });

      await tx.anden.update({
        where: { id: andenId },
        data: { ocupado: true },
      });

      await tx.eventoCamion.create({
        data: {
          camionId,
          estado: EstadoCamion.ASIGNADO,
          usuarioId,
          nota: `Asignado al andén ${anden.codigo}`,
        },
      });

      return camionActualizado;
    });
  }

  /** Transición genérica de estado con validación */
  async cambiarEstado(
    camionId: string,
    nuevoEstado: EstadoCamion,
    usuarioId: string,
    nota?: string,
  ) {
    const camion = await this.obtenerCamionOError(camionId);

    this.validarTransicion(camion, nuevoEstado);

    return this.prisma.$transaction(async (tx) => {
      const datos: any = { estado: nuevoEstado };

      // Si se despacha, liberar el andén y registrar hora de salida
      if (nuevoEstado === EstadoCamion.DESPACHADO && camion.andenId) {
        await tx.anden.update({
          where: { id: camion.andenId },
          data: { ocupado: false },
        });
        datos.horaSalidaReal = new Date();
      }

      // Si llega a portería, registrar hora de llegada real
      if (nuevoEstado === EstadoCamion.EN_PORTERIA) {
        datos.horaLlegadaReal = new Date();
      }

      const camionActualizado = await tx.camion.update({
        where: { id: camionId },
        data: datos,
        include: { anden: true },
      });

      await tx.eventoCamion.create({
        data: {
          camionId,
          estado: nuevoEstado,
          usuarioId,
          nota,
        },
      });

      return camionActualizado;
    });
  }

  /** Finaliza carga: nacional/interplanta → LISTO, exportación → EN_TUNEL_FRIO */
  async finalizarCarga(camionId: string, usuarioId: string) {
    const camion = await this.obtenerCamionOError(camionId);

    // Exportación va a túnel frío, el resto directo a LISTO
    const nuevoEstado = camion.tipo === 'EXPORTACION'
      ? EstadoCamion.EN_TUNEL_FRIO
      : EstadoCamion.LISTO;

    return this.cambiarEstado(camionId, nuevoEstado, usuarioId, 'Carga finalizada');
  }

  // --- Helpers privados ---

  private async obtenerCamionOError(id: string) {
    const camion = await this.prisma.camion.findUnique({ where: { id } });
    if (!camion) throw new NotFoundException('Camión no encontrado');
    return camion;
  }

  private validarTransicion(
    camion: { tipo: any; estado: any; patente: string },
    nuevoEstado: EstadoCamion,
  ) {
    if (!esTransicionValida(camion.tipo, camion.estado, nuevoEstado)) {
      throw new BadRequestException(
        `Transición inválida: ${camion.estado} → ${nuevoEstado} para camión ${camion.patente} (tipo ${camion.tipo})`,
      );
    }
  }
}
```

- [ ] **Step 4: Crear CamionesController**

```typescript
// apps/api/src/camiones/camiones.controller.ts
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EstadoCamion } from '@prisma/client';
import { CamionesService } from './camiones.service';
import { CrearCamionDto } from './dto/crear-camion.dto';
import { AsignarAndenDto } from './dto/asignar-anden.dto';
import { FiltrosCamionDto } from './dto/filtros-camion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decoradores/roles.decorator';
import { UsuarioActual } from '../auth/decoradores/usuario-actual.decorator';

@ApiTags('Camiones')
@ApiBearerAuth()
@Controller('camiones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CamionesController {
  constructor(private readonly camionesService: CamionesService) {}

  @Post()
  @Roles('COORDINADOR_TRANSPORTE')
  @ApiOperation({ summary: 'Crear camión programado (solo Coordinador Transporte)' })
  crear(@Body() dto: CrearCamionDto) {
    return this.camionesService.crear(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar camiones con filtros opcionales' })
  listar(@Query() filtros: FiltrosCamionDto) {
    return this.camionesService.listar(filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de camión con historial de eventos' })
  obtenerPorId(@Param('id') id: string) {
    return this.camionesService.obtenerPorId(id);
  }

  @Patch(':id/asignar')
  @Roles('COORDINADOR')
  @ApiOperation({ summary: 'Asignar andén a camión (Coordinador)' })
  asignarAnden(
    @Param('id') id: string,
    @Body() dto: AsignarAndenDto,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.asignarAnden(id, dto.andenId, usuarioId);
  }

  @Patch(':id/iniciar-carga')
  @Roles('CARGADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Iniciar proceso de carga (Cargador/Supervisor)' })
  iniciarCarga(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.cambiarEstado(id, EstadoCamion.EN_CARGA, usuarioId);
  }

  @Patch(':id/finalizar-carga')
  @Roles('CARGADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Finalizar proceso de carga (Cargador/Supervisor)' })
  finalizarCarga(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    // Para exportación, va a EN_TUNEL_FRIO. Para nacional/interplanta, va a LISTO.
    // El service valida la transición basándose en el tipo de camión.
    // El controller intenta LISTO primero, si falla intenta EN_TUNEL_FRIO
    return this.camionesService.finalizarCarga(id, usuarioId);
  }

  @Patch(':id/temperatura-ok')
  @Roles('OPERADOR_TUNEL')
  @ApiOperation({ summary: 'Validar temperatura -18°C alcanzada (Operador Túnel)' })
  temperaturaOk(
    @Param('id') id: string,
    @UsuarioActual('id') usuarioId: string,
  ) {
    return this.camionesService.cambiarEstado(id, EstadoCamion.ESPERANDO_SAG, usuarioId);
  }
}
```

- [ ] **Step 5: Crear CamionesModule y registrar en AppModule**

```typescript
// apps/api/src/camiones/camiones.module.ts
import { Module } from '@nestjs/common';
import { CamionesController } from './camiones.controller';
import { CamionesService } from './camiones.service';

@Module({
  controllers: [CamionesController],
  providers: [CamionesService],
  exports: [CamionesService],
})
export class CamionesModule {}
```

Agregar a `app.module.ts`:
```typescript
import { CamionesModule } from './camiones/camiones.module';
// En imports: CamionesModule,
```

- [ ] **Step 6: Verificar en Swagger**

```bash
cd C:/Users/crist/Desktop/Sem_Titulo/apps/api
npx nest start
```

Esperado: Swagger muestra todos los endpoints de `/camiones/*`

- [ ] **Step 7: Commit**

```bash
cd C:/Users/crist/Desktop/Sem_Titulo
git add apps/api/src/camiones/ apps/api/src/app.module.ts
git commit -m "feat(api): agregar módulo de camiones con máquina de estados y transiciones validadas"
```

---

## Task 6: Seed de Datos Iniciales

**Files:**
- Create: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Crear script de seed**

```typescript
// apps/api/prisma/seed.ts
import { PrismaClient, RolUsuario, TipoEdificio } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

  // --- Edificios ---
  const aves = await prisma.edificio.upsert({
    where: { tipo: 'AVES' },
    update: {},
    create: { nombre: 'Planta Aves', tipo: TipoEdificio.AVES },
  });

  const cerdo = await prisma.edificio.upsert({
    where: { tipo: 'CERDO' },
    update: {},
    create: { nombre: 'Planta Cerdo', tipo: TipoEdificio.CERDO },
  });

  const frigorifico = await prisma.edificio.upsert({
    where: { tipo: 'FRIGORIFICO' },
    update: {},
    create: { nombre: 'Frigorífico', tipo: TipoEdificio.FRIGORIFICO },
  });

  console.log('✅ Edificios creados');

  // --- Andenes ---
  const andenesData = [
    { codigo: 'A1', edificioId: aves.id },
    { codigo: 'A2', edificioId: aves.id },
    { codigo: 'A3', edificioId: aves.id },
    { codigo: 'A4', edificioId: aves.id },
    { codigo: 'A5', edificioId: aves.id },
    { codigo: 'C1', edificioId: cerdo.id },
    { codigo: 'C2', edificioId: cerdo.id },
    { codigo: 'C3', edificioId: cerdo.id },
    { codigo: 'F1', edificioId: frigorifico.id },
    { codigo: 'F2', edificioId: frigorifico.id },
    { codigo: 'F3', edificioId: frigorifico.id },
  ];

  for (const anden of andenesData) {
    await prisma.anden.upsert({
      where: { codigo: anden.codigo },
      update: {},
      create: anden,
    });
  }

  console.log('✅ 11 andenes creados (A1-A5, C1-C3, F1-F3)');

  // --- Usuarios de prueba (1 por rol) ---
  const passwordHash = await bcrypt.hash('clave123', 10);

  const usuariosData = [
    { nombre: 'Carlos Jefe', rut: '11.111.111-1', email: 'jefe@dispatch.cl', rol: RolUsuario.JEFE_DESPACHO, edificioId: null },
    { nombre: 'Ana Coordinadora Transporte', rut: '22.222.222-2', email: 'coord.transporte@dispatch.cl', rol: RolUsuario.COORDINADOR_TRANSPORTE, edificioId: null },
    { nombre: 'Pedro Coordinador', rut: '33.333.333-3', email: 'coordinador@dispatch.cl', rol: RolUsuario.COORDINADOR, edificioId: null },
    { nombre: 'Luis Pickinero', rut: '44.444.444-4', email: 'pickinero@dispatch.cl', rol: RolUsuario.PICKINERO, edificioId: aves.id },
    { nombre: 'María Cargadora', rut: '55.555.555-5', email: 'cargador@dispatch.cl', rol: RolUsuario.CARGADOR, edificioId: aves.id },
    { nombre: 'Jorge Supervisor', rut: '66.666.666-6', email: 'supervisor@dispatch.cl', rol: RolUsuario.SUPERVISOR, edificioId: aves.id },
    { nombre: 'Roberto Operador Túnel', rut: '77.777.777-7', email: 'tunel@dispatch.cl', rol: RolUsuario.OPERADOR_TUNEL, edificioId: frigorifico.id },
    { nombre: 'Inspector García (SAG)', rut: '88.888.888-8', email: 'sag@dispatch.cl', rol: RolUsuario.SAG, edificioId: null },
  ];

  for (const usuario of usuariosData) {
    await prisma.usuario.upsert({
      where: { rut: usuario.rut },
      update: {},
      create: { ...usuario, passwordHash },
    });
  }

  console.log('✅ 8 usuarios de prueba creados (contraseña: clave123)');
  console.log('🎉 Seed completado');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Ejecutar seed**

Nota: La configuración `"prisma": { "schema": ..., "seed": ... }` ya está en `package.json` desde Task 1.

```bash
cd C:/Users/crist/Desktop/Sem_Titulo/apps/api
npx prisma db seed
```

Esperado: 3 edificios, 11 andenes, 8 usuarios creados.

- [ ] **Step 3: Probar login con un usuario del seed**

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identificador": "jefe@dispatch.cl", "password": "clave123"}'
```

Esperado: Respuesta con `accessToken` y datos del usuario.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/crist/Desktop/Sem_Titulo
git add apps/api/prisma/ apps/api/package.json
git commit -m "feat(api): agregar seed con edificios, andenes y usuarios de prueba"
```

---

## Resumen de Entregables Fase 2A

Al completar esta fase, el backend tendrá:

1. **NestJS** configurado con Swagger, helmet, CORS, validación global, rate limiting
2. **Prisma** con schema completo (14 modelos) y migración inicial
3. **Autenticación JWT** dual token (access 15min + refresh 7d HttpOnly cookie)
4. **RBAC** con guards de roles y decoradores personalizados
5. **Módulo Usuarios** con CRUD completo y control de acceso
6. **Módulo Camiones** con máquina de estados validada y transiciones por tipo
7. **Seed** con datos iniciales para desarrollo (3 edificios, 11 andenes, 8 usuarios)
8. **Swagger** documentando todos los endpoints

### Fase 2B (siguiente plan):
- Módulo SAG (inspecciones de exportación)
- Módulo Pallets (registro y trazabilidad)
- Módulo Atrasos
- Módulo Andenes
- WebSocket Gateway + Redis Pub/Sub
- Módulo Dashboard (agregaciones KPI)
