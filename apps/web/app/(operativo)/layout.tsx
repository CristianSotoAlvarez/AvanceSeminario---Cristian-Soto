"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { motion } from "motion/react";
import { Package, Truck, Thermometer, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SidebarItem } from "@/components/sidebar-item";
import { Header } from "@/components/header";

// ─── Roles que pueden acceder al área operativa ────────────────────────────────

const ROLES_OPERATIVO = ["PICKINERO", "CARGADOR", "OPERADOR_TUNEL", "SUPERVISOR"];

// ─── Ítems de navegación según rol ────────────────────────────────────────────

const ITEMS_NAV = [
  {
    icon: LayoutDashboard,
    label: "Tablero",
    href: "/dashboard",
    roles: ["PICKINERO", "CARGADOR", "OPERADOR_TUNEL", "SUPERVISOR"],
  },
  {
    icon: Package,
    label: "Picking",
    href: "/picking",
    roles: ["PICKINERO", "SUPERVISOR"],
  },
  {
    icon: Truck,
    label: "Carga",
    href: "/carga",
    roles: ["CARGADOR", "SUPERVISOR"],
  },
  {
    icon: Thermometer,
    label: "Túnel",
    href: "/tunel",
    roles: ["OPERADOR_TUNEL", "SUPERVISOR"],
  },
];

const TITULOS_RUTA: Record<string, string> = {
  "/dashboard": "Tablero",
  "/picking": "Picking",
  "/carga": "Carga",
  "/tunel": "Túnel Frío",
};

// ─── Layout ────────────────────────────────────────────────────────────────────

export default function OperativoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { usuario, cargando } = useAuth();

  // Verificar autenticación y rol
  useEffect(() => {
    if (cargando) return;
    if (!usuario) {
      router.push("/login");
      return;
    }
    if (!ROLES_OPERATIVO.includes(usuario.rol)) {
      // Redirigir al dashboard si el rol no tiene acceso operativo
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

  if (!usuario || !ROLES_OPERATIVO.includes(usuario.rol)) return null;

  // Filtrar ítems según rol del usuario, con soporte de polivalencia
  // (un PICKINERO polivalente también ve Carga, y viceversa).
  const polivalente = usuario.polivalente ?? false;
  const itemsVisibles = ITEMS_NAV.filter(item => {
    if (item.roles.includes(usuario.rol)) return true;
    if (polivalente) {
      if (usuario.rol === "PICKINERO" && item.href === "/carga") return true;
      if (usuario.rol === "CARGADOR" && item.href === "/picking") return true;
    }
    return false;
  });

  const titulo = TITULOS_RUTA[pathname] ?? "Operativo";

  return (
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar vertical de iconos — compacta, touch-friendly */}
        <motion.aside
          initial={{ x: -72 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-[72px] h-screen bg-bg-surface border-r border-bg-elevated flex flex-col z-40 shrink-0"
        >
          {/* Logo icono */}
          <div className="flex items-center justify-center h-14 border-b border-bg-elevated shrink-0">
            <img
              src="/logo-icon.png"
              alt="JAT"
              className="w-[44px] h-[44px] object-contain"
            />
          </div>

          {/* Navegación */}
          <nav className="flex-1 flex flex-col items-center py-3 gap-1">
            {itemsVisibles.map(item => (
              <SidebarItem
                key={item.href}
                icon={item.icon}
                label={item.label}
                href={item.href}
                active={pathname === item.href}
                collapsed={true}
              />
            ))}
          </nav>
        </motion.aside>

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title={titulo} />
          <main className="flex-1 overflow-y-auto p-4 bg-bg-primary">
            {children}
          </main>
        </div>

        <Toaster
          position="bottom-center"
          toastOptions={{
            style: { fontFamily: "var(--font-display, sans-serif)", fontSize: "13px" },
            duration: 3500,
          }}
          richColors
        />
      </div>
  );
}
