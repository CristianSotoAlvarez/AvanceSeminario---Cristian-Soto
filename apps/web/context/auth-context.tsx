"use client";

import { createContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  loginApi,
  logoutApi,
  guardarToken,
  limpiarToken,
  type UsuarioAuth,
  type RespuestaLogin,
} from "@/lib/api";

interface AuthContexto {
  usuario: UsuarioAuth | null;
  cargando: boolean;
  error: string | null;
  login: (identificador: string, password: string) => Promise<RespuestaLogin>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContexto | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAuth | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function recuperarSesion() {
      try {
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
        // Sin sesión previa
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
      return datos;
    } catch (err: any) {
      const mensaje = err.message || 'Error al iniciar sesión';
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
