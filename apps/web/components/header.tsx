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
