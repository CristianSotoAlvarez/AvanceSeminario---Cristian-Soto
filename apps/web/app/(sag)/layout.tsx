"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { Shield, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// ─── Roles con acceso al área SAG ─────────────────────────────────────────────

const ROLES_SAG = ["SAG"];

// ─── Layout ────────────────────────────────────────────────────────────────────

export default function SagLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { usuario, cargando, logout } = useAuth();

  // Verificar autenticación y rol
  useEffect(() => {
    if (cargando) return;
    if (!usuario) {
      router.push("/login");
      return;
    }
    if (!ROLES_SAG.includes(usuario.rol)) {
      router.push("/dashboard");
    }
  }, [cargando, usuario, router]);

  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="text-text-muted font-display text-sm">Cargando…</div>
      </div>
    );
  }

  if (!usuario || !ROLES_SAG.includes(usuario.rol)) return null;

  async function manejarLogout() {
    await logout();
    router.push("/login");
  }

  return (
      <div className="flex h-screen flex-col overflow-hidden">
        {/* Header SAG simplificado */}
        <header className="h-14 bg-bg-surface border-b border-bg-elevated flex items-center justify-between px-6 shrink-0 z-40">
          {/* Logo + título */}
          <div className="flex items-center gap-3">
            <img
              src="/logo-icon.png"
              alt="JAT"
              className="w-8 h-8 object-contain"
            />
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-[#7C3AED]" />
              <span className="font-display text-[13px] font-bold uppercase tracking-widest text-text-primary">
                Portal SAG
              </span>
            </div>
            {/* Indicador En Vivo */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F0FDF4] border border-[#BBF7D0]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#16A34A]" />
              </span>
              <span className="font-display text-[9px] font-bold uppercase tracking-widest text-[#16A34A]">En Vivo</span>
            </div>
          </div>

          {/* Nombre inspector + logout */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-display text-xs font-semibold text-text-primary leading-tight">
                {usuario.nombre}
              </p>
              <p className="font-display text-[10px] text-[#7C3AED] leading-tight">
                Inspector SAG
              </p>
            </div>
            <button
              onClick={manejarLogout}
              className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center text-text-muted hover:text-semantic-error transition-colors cursor-pointer"
              aria-label="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto p-6 bg-bg-primary">
          {children}
        </main>

        <Toaster
          position="bottom-center"
          toastOptions={{
            style: { fontFamily: "var(--font-display, sans-serif)", fontSize: "13px" },
            duration: 4000,
          }}
          richColors
        />
      </div>
  );
}
