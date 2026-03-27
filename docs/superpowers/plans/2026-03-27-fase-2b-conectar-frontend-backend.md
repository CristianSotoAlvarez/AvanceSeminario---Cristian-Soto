# Fase 2B: Conectar Frontend con Backend — Auth + Dashboard + Camiones

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar el frontend Next.js al backend NestJS para tener login funcional, rutas protegidas, dashboard con datos reales y gestión básica de camiones — una demo de punta a punta.

**Architecture:** Cliente API con fetch nativo + React Context para sesión. Next.js middleware protege rutas según rol. Páginas usan hooks personalizados para llamar a la API. Tokens: access token en memoria (Context), refresh token en cookie HttpOnly (manejado por backend).

**Tech Stack:** Next.js 15, React 19, fetch API, React Context

**Nota idioma:** Todo el código (variables, comentarios, commits) debe estar en español. Excepciones: nombres técnicos estándar de Next.js/React (useState, useEffect, Context, Provider, middleware, etc.).

---

## Estructura de Archivos

```
apps/web/
├── lib/
│   └── api.ts                              ← Cliente API centralizado (fetch)
├── context/
│   └── auth-context.tsx                    ← React Context de autenticación
├── hooks/
│   ├── use-auth.ts                         ← Hook para acceder al contexto auth
│   └── use-camiones.ts                     ← Hook para datos de camiones
├── components/
│   ├── providers.tsx                       ← (Modificar) Envolver con AuthProvider
│   ├── header.tsx                          ← (Modificar) Mostrar nombre y rol del usuario
│   └── sidebar.tsx                         ← (Modificar) Filtrar items según rol
├── app/
│   ├── page.tsx                            ← (Modificar) Redirigir a /login si no auth
│   ├── (auth)/login/page.tsx               ← (Modificar) Conectar formulario al backend
│   └── (platform)/
│       ├── dashboard/page.tsx              ← (Modificar) Datos reales de la API
│       └── camiones/page.tsx               ← (Crear) Listado y gestión de camiones
```

---

## Task 1: Cliente API Centralizado

**Files:**
- Create: `apps/web/lib/api.ts`

- [ ] **Step 1: Crear cliente API con fetch**

```typescript
// apps/web/lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/** Token de acceso en memoria (no localStorage por seguridad) */
let accessToken: string | null = null;

export function obtenerToken(): string | null {
  return accessToken;
}

export function guardarToken(token: string): void {
  accessToken = token;
}

export function limpiarToken(): void {
  accessToken = null;
}

/** Fetch wrapper con manejo de auth y refresh automático */
async function fetchApi<T>(
  endpoint: string,
  opciones: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((opciones.headers as Record<string, string>) || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const respuesta = await fetch(`${API_URL}${endpoint}`, {
    ...opciones,
    headers,
    credentials: 'include', // Envía cookies (refresh token)
  });

  // Si el token expiró, intentar refresh
  if (respuesta.status === 401 && accessToken) {
    const refreshExitoso = await intentarRefresh();
    if (refreshExitoso) {
      // Reintentar la petición original con el nuevo token
      headers['Authorization'] = `Bearer ${accessToken}`;
      const reintento = await fetch(`${API_URL}${endpoint}`, {
        ...opciones,
        headers,
        credentials: 'include',
      });
      if (!reintento.ok) {
        const error = await reintento.json().catch(() => ({}));
        throw new ApiError(reintento.status, error.message || 'Error en la petición');
      }
      return reintento.json();
    } else {
      // Refresh falló — limpiar sesión
      limpiarToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiError(401, 'Sesión expirada');
    }
  }

  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new ApiError(respuesta.status, error.message || 'Error en la petición');
  }

  return respuesta.json();
}

/** Intenta renovar el access token usando el refresh token (cookie) */
async function intentarRefresh(): Promise<boolean> {
  try {
    const respuesta = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!respuesta.ok) return false;

    const datos = await respuesta.json();
    accessToken = datos.accessToken;
    return true;
  } catch {
    return false;
  }
}

/** Error tipado de la API */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// =====================
// Endpoints de Auth
// =====================

export interface UsuarioAuth {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  edificioId: string | null;
}

export interface RespuestaLogin {
  accessToken: string;
  usuario: UsuarioAuth;
}

export async function loginApi(identificador: string, password: string): Promise<RespuestaLogin> {
  const datos = await fetchApi<RespuestaLogin>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identificador, password }),
  });
  accessToken = datos.accessToken;
  return datos;
}

export async function logoutApi(): Promise<void> {
  try {
    await fetchApi('/auth/logout', { method: 'POST' });
  } finally {
    limpiarToken();
  }
}

export async function obtenerPerfilApi(): Promise<UsuarioAuth> {
  return fetchApi<UsuarioAuth>('/auth/me');
}

// =====================
// Endpoints de Camiones
// =====================

export interface Camion {
  id: string;
  patente: string;
  tipo: string;
  estado: string;
  andenId: string | null;
  anden: { id: string; codigo: string } | null;
  pedido: { id: string; numero: string; cliente: { nombre: string } } | null;
  horaLlegadaPlanificada: string;
  horaSalidaPlanificada: string | null;
  horaLlegadaReal: string | null;
  horaSalidaReal: string | null;
  creadoEn: string;
}

export async function listarCamionesApi(filtros?: {
  estado?: string;
  tipo?: string;
}): Promise<Camion[]> {
  const params = new URLSearchParams();
  if (filtros?.estado) params.set('estado', filtros.estado);
  if (filtros?.tipo) params.set('tipo', filtros.tipo);
  const query = params.toString();
  return fetchApi<Camion[]>(`/camiones${query ? `?${query}` : ''}`);
}

export async function obtenerCamionApi(id: string) {
  return fetchApi<Camion & { eventos: any[]; estadosSiguientes: string[] }>(`/camiones/${id}`);
}

export async function cambiarEstadoCamionApi(
  id: string,
  endpoint: string,
  body?: Record<string, unknown>,
) {
  return fetchApi<Camion>(`/camiones/${id}/${endpoint}`, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}
```

- [ ] **Step 2: Agregar variable de entorno**

Crear `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/ apps/web/.env.local
git commit -m "feat(web): agregar cliente API centralizado con manejo de tokens y refresh automático"
```

---

## Task 2: Contexto de Autenticación

**Files:**
- Create: `apps/web/context/auth-context.tsx`
- Create: `apps/web/hooks/use-auth.ts`
- Modify: `apps/web/components/providers.tsx`

- [ ] **Step 1: Crear AuthContext**

```typescript
// apps/web/context/auth-context.tsx
"use client";

import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  loginApi,
  logoutApi,
  obtenerPerfilApi,
  guardarToken,
  limpiarToken,
  type UsuarioAuth,
  type ApiError,
} from "@/lib/api";

interface AuthContexto {
  usuario: UsuarioAuth | null;
  cargando: boolean;
  error: string | null;
  login: (identificador: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContexto | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAuth | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Al montar, intentar recuperar sesión con refresh token (cookie)
  useEffect(() => {
    async function recuperarSesion() {
      try {
        // Intenta refresh — si hay cookie válida, obtiene nuevo access token
        const respuesta = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/refresh`,
          { method: 'POST', credentials: 'include' },
        );

        if (respuesta.ok) {
          const datos = await respuesta.json();
          guardarToken(datos.accessToken);
          setUsuario(datos.usuario);
        }
      } catch {
        // Sin sesión previa — normal
      } finally {
        setCargando(false);
      }
    }

    recuperarSesion();
  }, []);

  const login = useCallback(async (identificador: string, password: string) => {
    setError(null);
    setCargando(true);
    try {
      const datos = await loginApi(identificador, password);
      setUsuario(datos.usuario);
    } catch (err) {
      const mensaje = (err as ApiError).message || 'Error al iniciar sesión';
      setError(mensaje);
      throw err;
    } finally {
      setCargando(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      setUsuario(null);
      limpiarToken();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, cargando, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 2: Crear hook useAuth**

```typescript
// apps/web/hooks/use-auth.ts
"use client";

import { useContext } from "react";
import { AuthContext } from "@/context/auth-context";

export function useAuth() {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return contexto;
}
```

- [ ] **Step 3: Envolver app con AuthProvider**

```typescript
// apps/web/components/providers.tsx
"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/context/auth-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
```

- [ ] **Step 4: Verificar compilación**

```bash
cd apps/web && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/context/ apps/web/hooks/use-auth.ts apps/web/components/providers.tsx
git commit -m "feat(web): agregar contexto de autenticación con login, logout y recuperación de sesión"
```

---

## Task 3: Login Funcional

**Files:**
- Modify: `apps/web/app/(auth)/login/page.tsx`
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Conectar formulario de login al backend**

```typescript
// apps/web/app/(auth)/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@dispatch-track/ui";
import { Truck, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
  const router = useRouter();
  const { login, usuario, cargando } = useAuth();
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Si ya está autenticado, redirigir al dashboard
  useEffect(() => {
    if (!cargando && usuario) {
      router.push("/dashboard");
    }
  }, [cargando, usuario, router]);

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      await login(identificador, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Credenciales inválidas");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary relative overflow-hidden">
      {/* Fondo gradiente */}
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

        {/* Formulario */}
        <form onSubmit={manejarSubmit} className="space-y-5">
          <Input
            label="RUT o Email"
            placeholder="12.345.678-9"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="text-semantic-error text-sm text-center">{error}</p>
          )}

          <Button
            type="submit"
            size="lg-emphasis"
            className="w-full"
            disabled={enviando || !identificador || !password}
          >
            {enviando ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Ingresando...
              </span>
            ) : (
              "Iniciar Sesión"
            )}
          </Button>
        </form>

        {/* Credenciales de prueba */}
        <div className="mt-6 pt-4 border-t border-bg-elevated">
          <p className="text-text-muted text-xs text-center">
            Demo: <span className="text-text-primary">jefe@dispatch.cl</span> / <span className="text-text-primary">clave123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Actualizar página raíz para redirigir a login**

```typescript
// apps/web/app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
```

- [ ] **Step 3: Verificar compilación**

```bash
cd apps/web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/page.tsx apps/web/app/(auth)/login/page.tsx
git commit -m "feat(web): conectar formulario de login al backend con manejo de errores y loading"
```

---

## Task 4: Protección de Rutas y Navegación por Rol

**Files:**
- Modify: `apps/web/components/header.tsx`
- Modify: `apps/web/app/(platform)/layout.tsx`

- [ ] **Step 1: Actualizar Header para mostrar usuario y botón de logout**

```typescript
// apps/web/components/header.tsx
"use client";

import { Bell, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

const etiquetasRol: Record<string, string> = {
  JEFE_DESPACHO: "Jefe de Despacho",
  COORDINADOR_TRANSPORTE: "Coord. Transporte",
  COORDINADOR: "Coordinador",
  PICKINERO: "Pickinero",
  CARGADOR: "Cargador",
  SUPERVISOR: "Supervisor",
  OPERADOR_TUNEL: "Operador Túnel",
  SAG: "Inspector SAG",
};

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { usuario, logout } = useAuth();
  const router = useRouter();

  async function manejarLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="h-14 bg-bg-surface border-b border-bg-elevated flex items-center justify-between px-6 z-header">
      <h1 className="font-display text-h3 uppercase text-text-primary">
        {title}
      </h1>
      <div className="flex items-center gap-4">
        <button
          className="text-text-muted hover:text-text-primary transition-colors"
          aria-label="Notificaciones"
        >
          <Bell size={18} />
        </button>

        {usuario && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-text-primary leading-tight">
                {usuario.nombre}
              </p>
              <p className="text-xs text-text-muted leading-tight">
                {etiquetasRol[usuario.rol] || usuario.rol}
              </p>
            </div>
            <button
              onClick={manejarLogout}
              className="w-8 h-8 rounded-md bg-bg-elevated flex items-center justify-center text-text-muted hover:text-semantic-error transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Proteger layout de plataforma (redirigir si no autenticado)**

```typescript
// apps/web/app/(platform)/layout.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { useAuth } from "@/hooks/use-auth";

const titulosRuta: Record<string, string> = {
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
  const router = useRouter();
  const { usuario, cargando } = useAuth();
  const titulo = titulosRuta[pathname] || "DispatchTrack";

  // Redirigir a login si no está autenticado
  useEffect(() => {
    if (!cargando && !usuario) {
      router.push("/login");
    }
  }, [cargando, usuario, router]);

  // Pantalla de carga mientras verifica sesión
  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="text-text-muted font-display">Cargando...</div>
      </div>
    );
  }

  // No renderizar si no hay usuario (se está redirigiendo)
  if (!usuario) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPath={pathname} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={titulo} />
        <main className="flex-1 overflow-y-auto p-6 bg-bg-primary">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar compilación**

```bash
cd apps/web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/header.tsx apps/web/app/(platform)/layout.tsx
git commit -m "feat(web): proteger rutas de plataforma y mostrar usuario en header con logout"
```

---

## Task 5: Dashboard con Datos Reales

**Files:**
- Create: `apps/web/hooks/use-camiones.ts`
- Modify: `apps/web/app/(platform)/dashboard/page.tsx`

- [ ] **Step 1: Crear hook useCamiones**

```typescript
// apps/web/hooks/use-camiones.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { listarCamionesApi, type Camion } from "@/lib/api";

export function useCamiones(filtros?: { estado?: string; tipo?: string }) {
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await listarCamionesApi(filtros);
      setCamiones(datos);
    } catch (err: any) {
      setError(err.message || "Error al cargar camiones");
    } finally {
      setCargando(false);
    }
  }, [filtros?.estado, filtros?.tipo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { camiones, cargando, error, recargar: cargar };
}
```

- [ ] **Step 2: Actualizar Dashboard con datos reales**

```typescript
// apps/web/app/(platform)/dashboard/page.tsx
"use client";

import { KpiCard, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Skeleton } from "@dispatch-track/ui";
import { TruckState, TRUCK_STATE_COLOR } from "@dispatch-track/types";
import { useCamiones } from "@/hooks/use-camiones";

const etiquetasEstado: Record<string, string> = {
  ESPERADO: "ESPERADO",
  EN_PORTERIA: "EN PORTERÍA",
  ASIGNADO: "ASIGNADO",
  EN_CARGA: "EN CARGA",
  EN_TUNEL_FRIO: "EN TÚNEL FRÍO",
  ESPERANDO_SAG: "ESPERANDO SAG",
  APROBADO_SAG: "APROBADO SAG",
  RECHAZADO_SAG: "RECHAZADO SAG",
  LISTO: "LISTO",
  DESPACHADO: "DESPACHADO",
};

const etiquetasTipo: Record<string, string> = {
  NACIONAL: "Nacional",
  EXPORTACION: "Exportación",
  INTERPLANTA: "Interplanta",
};

export default function DashboardPage() {
  const { camiones, cargando } = useCamiones();

  // Calcular KPIs desde datos reales
  const totalCamiones = camiones.length;
  const despachados = camiones.filter((c) => c.estado === "DESPACHADO").length;
  const andenesOcupados = new Set(
    camiones.filter((c) => c.andenId).map((c) => c.andenId),
  ).size;
  const camionesActivos = camiones.filter((c) => c.estado !== "DESPACHADO");

  return (
    <div className="space-y-6">
      {/* Fila de KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Camiones Hoy"
          value={cargando ? "—" : totalCamiones}
          valueColor="#F56E0F"
        />
        <KpiCard
          label="Despachados"
          value={cargando ? "—" : despachados}
          valueColor="#7AB87A"
        />
        <KpiCard
          label="Andenes Ocupados"
          value={cargando ? "—" : `${andenesOcupados}/11`}
        />
        <KpiCard
          label="Activos"
          value={cargando ? "—" : camionesActivos.length}
          valueColor="#6896C8"
        />
      </div>

      {/* Tabla de camiones */}
      <div>
        <h2 className="font-display text-h3 uppercase text-text-primary mb-4">
          Camiones Activos
        </h2>

        {cargando ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : camionesActivos.length === 0 ? (
          <div className="text-center py-12 text-text-muted font-display">
            No hay camiones activos
          </div>
        ) : (
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
              {camionesActivos.map((camion) => (
                <TableRow key={camion.id}>
                  <TableCell className="font-semibold">
                    {camion.patente}
                  </TableCell>
                  <TableCell className="font-display text-text-muted">
                    {etiquetasTipo[camion.tipo] || camion.tipo}
                  </TableCell>
                  <TableCell className="font-display">
                    {camion.pedido?.cliente?.nombre || "—"}
                  </TableCell>
                  <TableCell>
                    {camion.anden?.codigo || "—"}
                  </TableCell>
                  <TableCell>
                    {new Date(camion.horaLlegadaPlanificada).toLocaleTimeString("es-CL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      color={
                        TRUCK_STATE_COLOR[camion.estado as TruckState] || "neutral"
                      }
                    >
                      {etiquetasEstado[camion.estado] || camion.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar compilación**

```bash
cd apps/web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/hooks/use-camiones.ts apps/web/app/(platform)/dashboard/page.tsx
git commit -m "feat(web): dashboard con datos reales desde la API y KPIs calculados"
```

---

## Task 6: Página de Gestión de Camiones

**Files:**
- Create: `apps/web/app/(platform)/camiones/page.tsx`

- [ ] **Step 1: Crear página de camiones con listado, filtros y cambio de estado**

```typescript
// apps/web/app/(platform)/camiones/page.tsx
"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
} from "@dispatch-track/ui";
import { TruckState, TRUCK_STATE_COLOR } from "@dispatch-track/types";
import { RefreshCw } from "lucide-react";
import { useCamiones } from "@/hooks/use-camiones";
import { cambiarEstadoCamionApi } from "@/lib/api";

const etiquetasEstado: Record<string, string> = {
  ESPERADO: "ESPERADO",
  EN_PORTERIA: "EN PORTERÍA",
  ASIGNADO: "ASIGNADO",
  EN_CARGA: "EN CARGA",
  EN_TUNEL_FRIO: "EN TÚNEL FRÍO",
  ESPERANDO_SAG: "ESPERANDO SAG",
  APROBADO_SAG: "APROBADO SAG",
  RECHAZADO_SAG: "RECHAZADO SAG",
  LISTO: "LISTO",
  DESPACHADO: "DESPACHADO",
};

const etiquetasTipo: Record<string, string> = {
  NACIONAL: "Nacional",
  EXPORTACION: "Exportación",
  INTERPLANTA: "Interplanta",
};

/** Mapea estado → endpoint del backend para transición */
const ACCIONES_ESTADO: Record<string, { endpoint: string; label: string }[]> = {
  EN_PORTERIA: [{ endpoint: "asignar", label: "Asignar Andén" }],
  ASIGNADO: [{ endpoint: "iniciar-carga", label: "Iniciar Carga" }],
  EN_CARGA: [{ endpoint: "finalizar-carga", label: "Finalizar Carga" }],
  EN_TUNEL_FRIO: [{ endpoint: "temperatura-ok", label: "Temp. OK" }],
  LISTO: [],
  DESPACHADO: [],
};

export default function CamionesPage() {
  const [filtroEstado, setFiltroEstado] = useState<string | undefined>();
  const { camiones, cargando, recargar } = useCamiones(
    filtroEstado ? { estado: filtroEstado } : undefined,
  );
  const [procesando, setProcesando] = useState<string | null>(null);

  async function manejarAccion(camionId: string, endpoint: string) {
    setProcesando(camionId);
    try {
      await cambiarEstadoCamionApi(camionId, endpoint);
      await recargar();
    } catch (err: any) {
      alert(err.message || "Error al cambiar estado");
    } finally {
      setProcesando(null);
    }
  }

  const estados = Object.keys(etiquetasEstado);

  return (
    <div className="space-y-6">
      {/* Barra de filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant={!filtroEstado ? "primary" : "outline"}
          size="sm"
          onClick={() => setFiltroEstado(undefined)}
        >
          Todos
        </Button>
        {estados.map((estado) => (
          <Button
            key={estado}
            variant={filtroEstado === estado ? "primary" : "outline"}
            size="sm"
            onClick={() => setFiltroEstado(estado)}
          >
            {etiquetasEstado[estado]}
          </Button>
        ))}

        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={recargar}>
            <RefreshCw size={14} className="mr-1" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : camiones.length === 0 ? (
        <div className="text-center py-12 text-text-muted font-display">
          No hay camiones{filtroEstado ? ` en estado ${etiquetasEstado[filtroEstado]}` : ""}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Patente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Andén</TableHead>
              <TableHead>Hora Plan.</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {camiones.map((camion) => (
              <TableRow key={camion.id}>
                <TableCell className="font-semibold">
                  {camion.patente}
                </TableCell>
                <TableCell className="font-display text-text-muted">
                  {etiquetasTipo[camion.tipo] || camion.tipo}
                </TableCell>
                <TableCell className="font-display">
                  {camion.pedido?.cliente?.nombre || "—"}
                </TableCell>
                <TableCell>{camion.anden?.codigo || "—"}</TableCell>
                <TableCell>
                  {new Date(camion.horaLlegadaPlanificada).toLocaleTimeString(
                    "es-CL",
                    { hour: "2-digit", minute: "2-digit" },
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    color={
                      TRUCK_STATE_COLOR[camion.estado as TruckState] || "neutral"
                    }
                  >
                    {etiquetasEstado[camion.estado] || camion.estado}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {(ACCIONES_ESTADO[camion.estado] || []).map((accion) => (
                      <Button
                        key={accion.endpoint}
                        variant="outline"
                        size="sm"
                        disabled={procesando === camion.id}
                        onClick={() =>
                          manejarAccion(camion.id, accion.endpoint)
                        }
                      >
                        {accion.label}
                      </Button>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilación**

```bash
cd apps/web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(platform)/camiones/
git commit -m "feat(web): agregar página de camiones con filtros por estado y acciones de transición"
```

---

## Resumen de Entregables Fase 2B

Al completar esta fase, el sistema tendrá:

1. **Login funcional** — Formulario conectado al backend, manejo de errores, spinner de carga
2. **Sesión persistente** — Refresh automático de tokens, recuperación de sesión al recargar
3. **Rutas protegidas** — Redirige a login si no hay sesión activa
4. **Header con usuario** — Muestra nombre, rol y botón de logout
5. **Dashboard con datos reales** — KPIs calculados desde la API, tabla de camiones activos
6. **Página de Camiones** — Listado con filtros por estado y botones de transición de estado
7. **Cliente API** — Centralizado con refresh automático de tokens

### Demo completa:
1. Abrir `localhost:3000` → redirige a login
2. Login con `jefe@dispatch.cl` / `clave123`
3. Dashboard muestra KPIs y camiones reales
4. Navegar a Camiones para ver listado con filtros
5. Cerrar sesión desde el header

### Fase 2C (siguiente):
- Crear camiones desde la interfaz (formulario)
- WebSocket para actualizaciones en tiempo real
- Página de Andenes con vista visual
- Módulos SAG, Pallets, Atrasos
