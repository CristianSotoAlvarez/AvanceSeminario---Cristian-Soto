# Fase 1: Scaffolding + Design System — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el monorepo Turborepo con la estructura completa del proyecto, el paquete compartido de UI con todos los tokens y componentes del design system, y los layouts base de la aplicación Next.js.

**Architecture:** Monorepo Turborepo con 2 apps (`web` Next.js 15, `api` placeholder) y 3 paquetes compartidos (`packages/ui`, `packages/types`, `packages/utils`). El design system vive en `packages/ui` y exporta componentes shadcn/ui customizados con la paleta dark industrial y tipografía Oswald+Sono.

**Tech Stack:** Turborepo, Next.js 15 (App Router), TypeScript 5.x, TailwindCSS v4, shadcn/ui, Framer Motion, Lucide Icons, Sono + Oswald (Google Fonts)

**Spec de referencia:** `docs/superpowers/specs/2026-03-24-dispatchtrack-design-system.md`

---

## Estructura de Archivos

```
dispatch-track/
├── turbo.json
├── package.json                          ← Root workspace config
├── .gitignore
├── docker-compose.yml                    ← PostgreSQL + Redis local
├── apps/
│   ├── web/                              ← Next.js 15 frontend
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── postcss.config.mjs
│   │   ├── app/
│   │   │   ├── layout.tsx               ← Root layout (fonts, providers)
│   │   │   ├── globals.css              ← Tailwind + custom tokens
│   │   │   ├── (auth)/
│   │   │   │   └── login/
│   │   │   │       └── page.tsx         ← Login page con video
│   │   │   ├── (platform)/
│   │   │   │   ├── layout.tsx           ← Sidebar completa + header
│   │   │   │   └── dashboard/
│   │   │   │       └── page.tsx         ← Dashboard placeholder
│   │   │   ├── (operativo)/
│   │   │   │   ├── layout.tsx           ← Sidebar simplificada
│   │   │   │   └── picking/
│   │   │   │       └── page.tsx         ← Picking placeholder
│   │   │   └── (sag)/
│   │   │       ├── layout.tsx           ← Layout independiente
│   │   │       └── exportaciones/
│   │   │           └── page.tsx         ← SAG placeholder
│   │   └── components/
│   │       ├── sidebar.tsx              ← Sidebar colapsable
│   │       ├── sidebar-item.tsx         ← Item de navegación individual
│   │       ├── header.tsx               ← Header superior
│   │       └── providers.tsx            ← Client providers (Framer, etc.)
│   └── api/                              ← NestJS placeholder (Fase 2)
│       └── package.json
├── packages/
│   ├── ui/                               ← Design system
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                 ← Barrel export
│   │   │   ├── utils/
│   │   │   │   ├── cn.ts               ← className merge utility
│   │   │   │   └── colors.ts           ← colorWithOpacity() utility
│   │   │   └── components/
│   │   │       ├── button.tsx           ← Button (3 sizes, 6 variants)
│   │   │       ├── badge.tsx            ← Badge (status states)
│   │   │       ├── card.tsx             ← Card + KPI Card
│   │   │       ├── input.tsx            ← Input (states: rest, focus, error, disabled)
│   │   │       ├── skeleton.tsx         ← Skeleton loading
│   │   │       └── table.tsx            ← Table (header, rows, hover)
│   ├── types/                            ← Tipos compartidos
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── roles.ts                 ← Enum de roles
│   │       ├── truck-states.ts          ← Enum de estados de camión
│   │       └── buildings.ts             ← Enum de edificios
│   └── utils/                            ← Utilidades compartidas
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts
```

---

## Task 1: Inicializar Monorepo Turborepo

**Files:**
- Create: `package.json` (root)
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `docker-compose.yml`

- [ ] **Step 1: Inicializar git y crear package.json root**

```bash
cd C:/Users/crist/Desktop/Sem_Titulo
git init
```

```json
// package.json
{
  "name": "dispatch-track",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2",
    "typescript": "^5.7"
  },
  "packageManager": "npm@10.8.0"
}
```

- [ ] **Step 2: Crear turbo.json**

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

- [ ] **Step 3: Crear .gitignore**

```
node_modules/
.next/
dist/
.turbo/
.env
.env.local
.superpowers/
*.log
```

- [ ] **Step 4: Crear docker-compose.yml**

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: dispatch
      POSTGRES_PASSWORD: dispatch_dev
      POSTGRES_DB: dispatch_track
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

- [ ] **Step 5: Instalar dependencias root y verificar**

```bash
npm install
```

Expected: `node_modules/` creado, turbo disponible.

- [ ] **Step 6: Commit**

```bash
git add package.json turbo.json .gitignore docker-compose.yml package-lock.json
git commit -m "chore: initialize turborepo monorepo structure"
```

---

## Task 2: Crear paquete packages/types

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/src/index.ts`
- Create: `packages/types/src/roles.ts`
- Create: `packages/types/src/truck-states.ts`
- Create: `packages/types/src/buildings.ts`

- [ ] **Step 1: Crear package.json de types**

```json
// packages/types/package.json
{
  "name": "@dispatch-track/types",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7"
  }
}
```

- [ ] **Step 2: Crear tsconfig.json**

```json
// packages/types/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Crear enums de roles**

```typescript
// packages/types/src/roles.ts
export enum UserRole {
  COORDINADOR_TRANSPORTE = "COORDINADOR_TRANSPORTE",
  COORDINADOR = "COORDINADOR",
  PICKINERO = "PICKINERO",
  CARGADOR = "CARGADOR",
  SUPERVISOR = "SUPERVISOR",
  OPERADOR_TUNEL = "OPERADOR_TUNEL",
  JEFE_DESPACHO = "JEFE_DESPACHO",
  SAG = "SAG",
}

/** Roles que acceden al grupo de rutas (platform) */
export const PLATFORM_ROLES: UserRole[] = [
  UserRole.JEFE_DESPACHO,
  UserRole.COORDINADOR,
  UserRole.COORDINADOR_TRANSPORTE,
  UserRole.SUPERVISOR,
];

/** Roles que acceden al grupo de rutas (operativo) */
export const OPERATIVO_ROLES: UserRole[] = [
  UserRole.PICKINERO,
  UserRole.CARGADOR,
  UserRole.OPERADOR_TUNEL,
  UserRole.SUPERVISOR,
];

/** Roles con alcance global (no restringidos a un edificio) */
export const GLOBAL_ROLES: UserRole[] = [
  UserRole.JEFE_DESPACHO,
  UserRole.COORDINADOR,
  UserRole.COORDINADOR_TRANSPORTE,
];
```

- [ ] **Step 4: Crear enums de estados de camión**

```typescript
// packages/types/src/truck-states.ts
export enum TruckState {
  ESPERADO = "ESPERADO",
  EN_PORTERIA = "EN_PORTERIA",
  ASIGNADO = "ASIGNADO",
  EN_CARGA = "EN_CARGA",
  EN_TUNEL_FRIO = "EN_TUNEL_FRIO",
  ESPERANDO_SAG = "ESPERANDO_SAG",
  APROBADO_SAG = "APROBADO_SAG",
  RECHAZADO_SAG = "RECHAZADO_SAG",
  LISTO = "LISTO",
  DESPACHADO = "DESPACHADO",
}

export enum TruckType {
  NACIONAL = "NACIONAL",
  EXPORTACION = "EXPORTACION",
  INTERPLANTA = "INTERPLANTA",
}

export type SemanticColor = "success" | "error" | "warning" | "info" | "active" | "neutral";

export const TRUCK_STATE_COLOR: Record<TruckState, SemanticColor> = {
  [TruckState.ESPERADO]: "neutral",
  [TruckState.EN_PORTERIA]: "info",
  [TruckState.ASIGNADO]: "warning",
  [TruckState.EN_CARGA]: "active",
  [TruckState.EN_TUNEL_FRIO]: "info",
  [TruckState.ESPERANDO_SAG]: "warning",
  [TruckState.APROBADO_SAG]: "success",
  [TruckState.RECHAZADO_SAG]: "error",
  [TruckState.LISTO]: "success",
  [TruckState.DESPACHADO]: "success",
};
```

- [ ] **Step 5: Crear enums de edificios**

```typescript
// packages/types/src/buildings.ts
export enum BuildingType {
  AVES = "AVES",
  CERDO = "CERDO",
  FRIGORIFICO = "FRIGORIFICO",
}

export const BUILDING_DOCKS: Record<BuildingType, string[]> = {
  [BuildingType.AVES]: ["A1", "A2", "A3", "A4", "A5"],
  [BuildingType.CERDO]: ["C1", "C2", "C3"],
  [BuildingType.FRIGORIFICO]: ["F1", "F2", "F3"],
};
```

- [ ] **Step 6: Crear barrel export**

```typescript
// packages/types/src/index.ts
export * from "./roles";
export * from "./truck-states";
export * from "./buildings";
```

- [ ] **Step 7: Commit**

```bash
git add packages/types/
git commit -m "feat: add shared types package with roles, truck states and buildings"
```

---

## Task 3: Crear paquete packages/utils

**Files:**
- Create: `packages/utils/package.json`
- Create: `packages/utils/tsconfig.json`
- Create: `packages/utils/src/index.ts`

- [ ] **Step 1: Crear package.json**

```json
// packages/utils/package.json
{
  "name": "@dispatch-track/utils",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7"
  }
}
```

- [ ] **Step 2: Crear tsconfig.json y barrel export**

```json
// packages/utils/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

```typescript
// packages/utils/src/index.ts
// Utilidades compartidas se agregarán según se necesiten
export {};
```

- [ ] **Step 3: Commit**

```bash
git add packages/utils/
git commit -m "feat: add shared utils package"
```

---

## Task 4: Crear paquete packages/ui — Utilidades

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/utils/cn.ts`
- Create: `packages/ui/src/utils/colors.ts`
- Create: `packages/ui/src/index.ts`

- [ ] **Step 1: Crear package.json**

```json
// packages/ui/package.json
{
  "name": "@dispatch-track/ui",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@dispatch-track/types": "*",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "motion": "^11",
    "lucide-react": "^0.460"
  },
  "devDependencies": {
    "react": "^19",
    "react-dom": "^19",
    "typescript": "^5.7",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4"
  },
  "peerDependencies": {
    "react": "^19",
    "react-dom": "^19"
  }
}
```

- [ ] **Step 2: Crear tsconfig.json**

```json
// packages/ui/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Crear cn utility**

```typescript
// packages/ui/src/utils/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Crear colors utility**

```typescript
// packages/ui/src/utils/colors.ts
/**
 * Convierte un hex a rgba con opacidad.
 * Usado para generar fondos y bordes de badges dinámicamente.
 */
export function hexToRgba(hex: string, opacity: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

/** Colores semánticos del design system */
export const semanticColors = {
  success: "#7AB87A",
  error: "#D4807A",
  warning: "#B8A860",
  info: "#6896C8",
  active: "#F56E0F",
  neutral: "#9A9A9A",
} as const;

/** Re-export del tipo centralizado en @dispatch-track/types */
export type SemanticColorKey = import("@dispatch-track/types").SemanticColor;

/**
 * Genera estilos de badge para un color semántico.
 * Background al 12%, borde al 25%, texto al 100%.
 */
export function getBadgeStyles(color: SemanticColorKey) {
  const hex = semanticColors[color];
  return {
    backgroundColor: hexToRgba(hex, 0.12),
    borderColor: hexToRgba(hex, 0.25),
    color: hex,
  };
}
```

- [ ] **Step 5: Crear barrel export**

```typescript
// packages/ui/src/index.ts
// Utils
export { cn } from "./utils/cn";
export { hexToRgba, semanticColors, getBadgeStyles } from "./utils/colors";
export type { SemanticColorKey } from "./utils/colors";

// Components (se exportarán a medida que se creen)
```

- [ ] **Step 6: Instalar dependencias y verificar**

```bash
cd C:/Users/crist/Desktop/Sem_Titulo
npm install
```

- [ ] **Step 7: Commit**

```bash
git add packages/ui/
git commit -m "feat: add UI package with color utilities and component base"
```

---

## Task 5: Crear app Next.js 15 (apps/web)

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/app/layout.tsx`

- [ ] **Step 1: Crear package.json**

```json
// apps/web/package.json
{
  "name": "@dispatch-track/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "motion": "^11",
    "lucide-react": "^0.460",
    "@dispatch-track/ui": "*",
    "@dispatch-track/types": "*",
    "@dispatch-track/utils": "*"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4",
    "postcss": "^8"
  }
}
```

- [ ] **Step 2: Crear next.config.ts**

```typescript
// apps/web/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dispatch-track/ui", "@dispatch-track/types", "@dispatch-track/utils"],
};

export default nextConfig;
```

- [ ] **Step 3: Crear tsconfig.json**

```json
// apps/web/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Crear postcss.config.mjs**

```javascript
// apps/web/postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 5: Crear globals.css con Tailwind v4 y tokens custom**

```css
/* apps/web/app/globals.css */
@import "tailwindcss";
@source "../../../packages/ui/src/**/*.{ts,tsx}";

@theme {
  /* Background */
  --color-bg-primary: #151419;
  --color-bg-surface: #1B1B1E;
  --color-bg-elevated: #262626;

  /* Text */
  --color-text-primary: #FBFBFB;
  --color-text-muted: #9A9A9A;

  /* Accent */
  --color-accent: #F56E0F;
  --color-accent-hover: #FF8534;

  /* Semantic */
  --color-semantic-success: #7AB87A;
  --color-semantic-error: #D4807A;
  --color-semantic-warning: #B8A860;
  --color-semantic-info: #6896C8;
  --color-semantic-neutral: #9A9A9A;

  /* Fonts — next/font/google inyecta los valores via --font-display y --font-data en <html> */
  --font-display: "Oswald", sans-serif;
  --font-data: "Sono", monospace;

  /* Spacing: usamos el scale nativo de Tailwind (1=4px, 2=8px, 4=16px, 6=24px, 8=32px, 10=40px) */
  /* No necesitamos tokens custom — el scale default es idéntico */

  /* Z-index */
  --z-sidebar: 10;
  --z-header: 20;
  --z-dropdown: 30;
  --z-tooltip: 40;
  --z-modal-overlay: 50;
  --z-modal: 60;
  --z-toast: 70;

  /* Animation */
  --animate-skeleton-pulse: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* Base styles */
body {
  font-family: var(--font-display);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}

/* Scrollbar dark theme */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: var(--color-bg-primary);
}
::-webkit-scrollbar-thumb {
  background: var(--color-bg-elevated);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #333;
}
```

- [ ] **Step 6: Crear root layout con fuentes y estructura base**

```tsx
// apps/web/app/layout.tsx
import type { Metadata } from "next";
import { Oswald, Sono } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["300", "400", "500", "600", "700"],
});

const sono = Sono({
  subsets: ["latin"],
  variable: "--font-data",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "DispatchTrack",
  description: "Sistema de Trazabilidad, Monitoreo y Rendimiento del Área de Despacho",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${oswald.variable} ${sono.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Instalar dependencias y verificar que el dev server arranca**

```bash
cd C:/Users/crist/Desktop/Sem_Titulo
npm install
npx turbo dev --filter=@dispatch-track/web
```

Expected: Next.js arranca en http://localhost:3000 sin errores.

- [ ] **Step 8: Commit**

```bash
git add apps/web/
git commit -m "feat: add Next.js 15 app with Tailwind v4 and design system tokens"
```

---

## Task 6: Crear placeholder de apps/api

**Files:**
- Create: `apps/api/package.json`

- [ ] **Step 1: Crear package.json placeholder**

```json
// apps/api/package.json
{
  "name": "@dispatch-track/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "echo 'API placeholder — Fase 2'",
    "build": "echo 'API placeholder — Fase 2'"
  },
  "dependencies": {
    "@dispatch-track/types": "*"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/
git commit -m "chore: add API app placeholder for Phase 2"
```

---

## Task 7: Componente Button

**Files:**
- Create: `packages/ui/src/components/button.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Crear componente Button con CVA (3 tamaños, 6 variantes)**

```tsx
// packages/ui/src/components/button.tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-display uppercase tracking-wide transition-transform active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-accent text-bg-primary hover:bg-accent-hover",
        outline: "bg-transparent text-accent border border-accent hover:bg-accent/5",
        secondary: "bg-bg-elevated text-text-primary border border-bg-elevated hover:bg-bg-elevated/80",
        danger: "bg-semantic-error text-bg-primary hover:brightness-110",
        success: "bg-semantic-success text-bg-primary hover:brightness-110",
      },
      size: {
        sm: "h-8 px-3 text-[11px] tracking-[0.5px] gap-1 rounded-sm",
        "sm-emphasis": "h-9 px-3 text-[11px] tracking-[0.5px] gap-1 rounded-sm",
        md: "h-10 px-4 text-[12px] tracking-[0.8px] gap-2 rounded-sm",
        "md-emphasis": "h-12 px-4 text-[12px] tracking-[0.8px] gap-2 rounded-sm",
        lg: "h-[52px] px-6 text-[14px] tracking-[1px] gap-2 rounded-sm",
        "lg-emphasis": "h-14 px-6 text-[14px] tracking-[1px] gap-2 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
```

- [ ] **Step 2: Exportar desde index.ts**

Agregar a `packages/ui/src/index.ts`:

```typescript
export { Button, type ButtonProps } from "./components/button";
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/button.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add Button component with 5 variants and 3 sizes"
```

---

## Task 8: Componente Badge

**Files:**
- Create: `packages/ui/src/components/badge.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Crear componente Badge con estilos dinámicos por color semántico**

```tsx
// packages/ui/src/components/badge.tsx
import { type HTMLAttributes } from "react";
import { cn } from "../utils/cn";
import { getBadgeStyles, type SemanticColorKey } from "../utils/colors";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color: SemanticColorKey;
}

export function Badge({ color, className, style, children, ...props }: BadgeProps) {
  const badgeStyles = getBadgeStyles(color);

  return (
    <span
      className={cn(
        "inline-block rounded-sm px-2.5 py-0.5 font-data text-badge font-semibold border",
        className
      )}
      style={{ ...badgeStyles, ...style }}
      {...props}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Exportar desde index.ts**

Agregar a `packages/ui/src/index.ts`:

```typescript
export { Badge, type BadgeProps } from "./components/badge";
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/badge.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add Badge component with semantic color styles"
```

---

## Task 9: Componentes Card, Input, Skeleton, Table

**Files:**
- Create: `packages/ui/src/components/card.tsx`
- Create: `packages/ui/src/components/input.tsx`
- Create: `packages/ui/src/components/skeleton.tsx`
- Create: `packages/ui/src/components/table.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Crear componente Card**

```tsx
// packages/ui/src/components/card.tsx
import { type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-bg-surface border border-bg-elevated rounded-md p-4",
        className
      )}
      {...props}
    />
  );
}

export interface KpiCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  valueColor?: string;
  trend?: { value: string; positive: boolean };
}

export function KpiCard({ label, value, valueColor, trend, className, ...props }: KpiCardProps) {
  return (
    <Card className={cn("flex flex-col", className)} {...props}>
      <span className="font-display text-label uppercase text-text-muted">
        {label}
      </span>
      <span
        className="font-data text-kpi-lg mt-1"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </span>
      {trend && (
        <span className={cn(
          "font-data text-data mt-1.5",
          trend.positive ? "text-semantic-success" : "text-semantic-error"
        )}>
          {trend.positive ? "↑" : "↓"} {trend.value}
        </span>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Crear componente Input**

```tsx
// packages/ui/src/components/input.tsx
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  compact?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, compact, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const hasError = !!error;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "font-display text-label uppercase",
              hasError ? "text-semantic-error" : "text-text-muted"
            )}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "bg-bg-elevated border rounded-sm px-4 py-2 font-display text-body text-text-primary",
            "outline-none transition-all",
            compact ? "h-8" : "h-10",
            hasError
              ? "border-semantic-error shadow-[0_0_0_3px_rgba(212,128,122,0.15)]"
              : "border-bg-elevated focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,110,15,0.15)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          {...props}
        />
        {(error || hint) && (
          <span className={cn(
            "font-display text-caption",
            hasError ? "text-semantic-error" : "text-text-muted"
          )}>
            {error || hint}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
```

- [ ] **Step 3: Crear componente Skeleton**

```tsx
// packages/ui/src/components/skeleton.tsx
import { type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-bg-elevated rounded-sm animate-skeleton-pulse",
        className
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Crear componente Table**

```tsx
// packages/ui/src/components/table.tsx
import { type HTMLAttributes, type ThHTMLAttributes, type TdHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto border border-bg-elevated rounded-md">
      <table className={cn("w-full border-collapse", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-bg-elevated", className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-bg-elevated/50 transition-colors",
        "even:bg-bg-primary/50 hover:bg-accent/[0.04] hover:border-l-2 hover:border-l-accent",
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-3.5 py-2.5 text-left font-display text-table-header uppercase text-text-muted",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-3.5 py-2.5 font-data text-data", className)}
      {...props}
    />
  );
}
```

- [ ] **Step 5: Exportar todos los componentes desde index.ts**

```typescript
// packages/ui/src/index.ts
// Utils
export { cn } from "./utils/cn";
export { hexToRgba, semanticColors, getBadgeStyles } from "./utils/colors";
export type { SemanticColorKey } from "./utils/colors";

// Components
export { Button, type ButtonProps } from "./components/button";
export { Badge, type BadgeProps } from "./components/badge";
export { Card, KpiCard, type KpiCardProps } from "./components/card";
export { Input, type InputProps } from "./components/input";
export { Skeleton } from "./components/skeleton";
export {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "./components/table";
```

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/
git commit -m "feat(ui): add Card, KpiCard, Input, Skeleton and Table components"
```

---

## Task 10: Componente Sidebar

**Files:**
- Create: `apps/web/components/sidebar-item.tsx`
- Create: `apps/web/components/sidebar.tsx`

- [ ] **Step 1: Crear SidebarItem**

```tsx
// apps/web/components/sidebar-item.tsx
"use client";

import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { cn } from "@dispatch-track/ui";

export interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
  collapsed?: boolean;
}

export function SidebarItem({ icon: Icon, label, href, active, collapsed }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 h-10 transition-colors",
        collapsed
          ? "justify-center mx-auto w-[38px] rounded-md"
          : "px-4 py-2",
        active
          ? "bg-accent/[0.08] text-accent border-l-[3px] border-l-accent"
          : "text-text-muted hover:bg-white/[0.03]"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon size={18} />
      {!collapsed && (
        <span className="font-display text-[12px] uppercase tracking-[0.5px] font-medium">
          {label}
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Crear Sidebar colapsable con Framer Motion**

```tsx
// apps/web/components/sidebar.tsx
"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Truck,
  Warehouse,
  Package,
  FileText,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { SidebarItem } from "./sidebar-item";

const platformItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Truck, label: "Camiones", href: "/camiones" },
  { icon: Warehouse, label: "Andenes", href: "/andenes" },
  { icon: Package, label: "Pallets", href: "/pallets" },
  { icon: FileText, label: "Reportes", href: "/reportes" },
  { icon: Shield, label: "SAG", href: "/sag" },
];

interface SidebarProps {
  currentPath?: string;
}

export function Sidebar({ currentPath = "/dashboard" }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      className="h-screen bg-bg-surface border-r border-bg-elevated flex flex-col z-sidebar"
      animate={{ width: collapsed ? 56 : 230 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-bg-elevated">
        <div className="w-[34px] h-[34px] bg-accent rounded-md flex items-center justify-center shrink-0">
          <Truck size={20} className="text-text-primary" />
        </div>
        {!collapsed && (
          <motion.span
            className="font-display text-[15px] font-semibold text-text-primary uppercase tracking-[0.5px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            DispatchTrack
          </motion.span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-2">
        {platformItems.map((item) => (
          <SidebarItem
            key={item.href}
            {...item}
            active={currentPath === item.href}
            collapsed={collapsed}
          />
        ))}

        <div className="mx-4 my-2 border-t border-bg-elevated" />

        <SidebarItem
          icon={Settings}
          label="Configuración"
          href="/configuracion"
          active={currentPath === "/configuracion"}
          collapsed={collapsed}
        />
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-bg-elevated text-text-muted hover:text-text-primary transition-colors"
        aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </motion.aside>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/
git commit -m "feat(web): add collapsible Sidebar with Framer Motion and Lucide icons"
```

---

## Task 11: Layouts por grupo de rutas

**Files:**
- Create: `apps/web/components/header.tsx`
- Create: `apps/web/components/providers.tsx`
- Create: `apps/web/app/(platform)/layout.tsx`
- Create: `apps/web/app/(platform)/dashboard/page.tsx`
- Create: `apps/web/app/(operativo)/layout.tsx`
- Create: `apps/web/app/(operativo)/picking/page.tsx`
- Create: `apps/web/app/(sag)/layout.tsx`
- Create: `apps/web/app/(sag)/exportaciones/page.tsx`
- Create: `apps/web/app/(auth)/login/page.tsx`
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: Crear Providers wrapper**

```tsx
// apps/web/components/providers.tsx
"use client";

import { type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 2: Crear Header**

```tsx
// apps/web/components/header.tsx
"use client";

import { Bell, User } from "lucide-react";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="h-14 bg-bg-surface border-b border-bg-elevated flex items-center justify-between px-6 z-header">
      <h1 className="font-display text-h3 uppercase text-text-primary">
        {title}
      </h1>
      <div className="flex items-center gap-4">
        <button className="text-text-muted hover:text-text-primary transition-colors" aria-label="Notificaciones">
          <Bell size={18} />
        </button>
        <div className="w-8 h-8 rounded-md bg-bg-elevated flex items-center justify-center">
          <User size={16} className="text-text-muted" />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Modificar root layout para incluir Providers**

```tsx
// apps/web/app/layout.tsx
import type { Metadata } from "next";
import { Oswald, Sono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["300", "400", "500", "600", "700"],
});

const sono = Sono({
  subsets: ["latin"],
  variable: "--font-data",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "DispatchTrack",
  description: "Sistema de Trazabilidad, Monitoreo y Rendimiento del Área de Despacho",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${oswald.variable} ${sono.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Crear layout de (platform) con Sidebar + Header**

```tsx
// apps/web/app/(platform)/layout.tsx
"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/camiones": "Camiones",
  "/andenes": "Andenes",
  "/pallets": "Pallets",
  "/reportes": "Reportes",
  "/sag": "SAG",
  "/configuracion": "Configuración",
};

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const title = routeTitles[pathname] || "DispatchTrack";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPath={pathname} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6 bg-bg-primary">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Crear dashboard placeholder con KPI cards y tabla de ejemplo**

```tsx
// apps/web/app/(platform)/dashboard/page.tsx
import { KpiCard, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@dispatch-track/ui";
import { TruckState, TRUCK_STATE_COLOR } from "@dispatch-track/types";

const mockTrucks = [
  { plate: "BXRK-42", type: "Nacional", client: "Walmart Chile", dock: "A3", time: "08:30", state: TruckState.EN_CARGA },
  { plate: "HJTL-87", type: "Exportación", client: "Costco USA", dock: "F2", time: "07:45", state: TruckState.EN_TUNEL_FRIO },
  { plate: "PLWZ-15", type: "Nacional", client: "SMU / Unimarc", dock: "C1", time: "09:00", state: TruckState.LISTO },
  { plate: "DRKM-63", type: "Interplanta", client: "Planta Rosario", dock: "—", time: "10:15", state: TruckState.ESPERADO },
];

const stateLabels: Record<TruckState, string> = {
  [TruckState.ESPERADO]: "ESPERADO",
  [TruckState.EN_PORTERIA]: "EN PORTERÍA",
  [TruckState.ASIGNADO]: "ASIGNADO",
  [TruckState.EN_CARGA]: "EN CARGA",
  [TruckState.EN_TUNEL_FRIO]: "EN TÚNEL FRÍO",
  [TruckState.ESPERANDO_SAG]: "ESPERANDO SAG",
  [TruckState.APROBADO_SAG]: "APROBADO SAG",
  [TruckState.RECHAZADO_SAG]: "RECHAZADO SAG",
  [TruckState.LISTO]: "LISTO",
  [TruckState.DESPACHADO]: "DESPACHADO",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Camiones Hoy" value={47} valueColor="#F56E0F" trend={{ value: "12% vs ayer", positive: true }} />
        <KpiCard label="Despachos a Tiempo" value="89%" valueColor="#7AB87A" trend={{ value: "3% vs ayer", positive: false }} />
        <KpiCard label="Andenes Ocupados" value="8/11" />
        <KpiCard label="Atrasos" value={5} valueColor="#D4807A" />
      </div>

      {/* Trucks Table */}
      <div>
        <h2 className="font-display text-h3 uppercase text-text-primary mb-4">
          Camiones Activos
        </h2>
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Patente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Andén</TableHead>
              <TableHead>Hora Plan.</TableHead>
              <TableHead>Estado</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {mockTrucks.map((truck) => (
              <TableRow key={truck.plate}>
                <TableCell className="font-semibold">{truck.plate}</TableCell>
                <TableCell className="font-display text-text-muted">{truck.type}</TableCell>
                <TableCell className="font-display">{truck.client}</TableCell>
                <TableCell>{truck.dock}</TableCell>
                <TableCell>{truck.time}</TableCell>
                <TableCell>
                  <Badge color={TRUCK_STATE_COLOR[truck.state]}>
                    {stateLabels[truck.state]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Crear layout y placeholder de (operativo)**

```tsx
// apps/web/app/(operativo)/layout.tsx
"use client";

import { Header } from "@/components/header";

export default function OperativoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header title="Operativo" />
      <main className="flex-1 overflow-y-auto p-6 bg-bg-primary">
        {children}
      </main>
    </div>
  );
}
```

```tsx
// apps/web/app/(operativo)/picking/page.tsx
export default function PickingPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="font-display text-h2 uppercase text-text-muted">
        Vista Picking — Fase 4
      </p>
    </div>
  );
}
```

- [ ] **Step 7: Crear layout y placeholder de (sag)**

```tsx
// apps/web/app/(sag)/layout.tsx
"use client";

import { Header } from "@/components/header";

export default function SagLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header title="Inspector SAG" />
      <main className="flex-1 overflow-y-auto p-6 bg-bg-primary">
        {children}
      </main>
    </div>
  );
}
```

```tsx
// apps/web/app/(sag)/exportaciones/page.tsx
export default function ExportacionesPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="font-display text-h2 uppercase text-text-muted">
        Portal SAG — Fase 4
      </p>
    </div>
  );
}
```

- [ ] **Step 8: Crear página de login placeholder**

```tsx
// apps/web/app/(auth)/login/page.tsx
import { Button, Input } from "@dispatch-track/ui";
import { Truck } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary relative overflow-hidden">
      {/* Video placeholder — se reemplazará con video real */}
      <div className="absolute inset-0 bg-gradient-to-br from-bg-primary via-bg-surface to-bg-elevated opacity-80" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-sm bg-bg-surface/90 backdrop-blur-lg border border-bg-elevated rounded-lg p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-accent rounded-xl flex items-center justify-center mb-4">
            <Truck size={32} className="text-text-primary" />
          </div>
          <h1 className="font-display text-h2 uppercase text-text-primary tracking-wider">
            DispatchTrack
          </h1>
          <p className="font-display text-caption text-text-muted mt-1">
            Sistema de Trazabilidad de Despacho
          </p>
        </div>

        {/* Form */}
        <form className="space-y-5">
          <Input label="RUT o Email" placeholder="12.345.678-9" />
          <Input label="Contraseña" type="password" placeholder="••••••••" />
          <Button size="lg-emphasis" className="w-full">
            Iniciar Sesión
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Crear página root que redirige a dashboard**

```tsx
// apps/web/app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

- [ ] **Step 10: Verificar que todo compila y se ve correctamente**

```bash
cd C:/Users/crist/Desktop/Sem_Titulo
npx turbo dev --filter=@dispatch-track/web
```

Verificar manualmente:
- `http://localhost:3000` → redirige a `/dashboard`
- `http://localhost:3000/dashboard` → muestra KPI cards + tabla con badges
- `http://localhost:3000/login` → muestra formulario de login
- Sidebar se colapsa/expande con animación

- [ ] **Step 11: Commit**

```bash
git add apps/web/
git commit -m "feat(web): add layouts for platform, operativo, sag and auth with dashboard page"
```

---

## Resumen de Entregables

Al completar esta fase, el proyecto tendrá:

1. **Monorepo Turborepo** funcional con estructura apps/ y packages/
2. **packages/types** con enums de roles, estados de camión y edificios
3. **packages/ui** con:
   - Tokens del design system definidos en globals.css @theme
   - Utilidades (cn, colorWithOpacity)
   - Componentes: Button, Badge, Card, KpiCard, Input, Skeleton, Table
4. **apps/web** (Next.js 15) con:
   - Tailwind v4 configurado con tokens custom
   - Sidebar colapsable con Framer Motion y Lucide Icons
   - Layout Platform (sidebar + header + content)
   - Layout Operativo (header + content simplificado)
   - Layout SAG (header + content independiente)
   - Dashboard con KPI cards y tabla de camiones (datos mock)
   - Login placeholder con formulario
5. **Docker Compose** para PostgreSQL y Redis (preparado para Fase 2)
