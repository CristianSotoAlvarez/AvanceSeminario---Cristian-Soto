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
import { useAuth } from "@/hooks/use-auth";

const TODOS_LOS_ELEMENTOS = [
  { icon: LayoutDashboard, label: "Dashboard",  href: "/dashboard", roles: ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE", "COORDINADOR", "SUPERVISOR"] },
  { icon: Truck,           label: "Camiones",   href: "/camiones",  roles: ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE", "COORDINADOR"] },
  { icon: Warehouse,       label: "Andenes",    href: "/andenes",   roles: ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE", "COORDINADOR", "SUPERVISOR", "OPERADOR_TUNEL", "CARGADOR", "PICKINERO"] },
  { icon: Package,         label: "Pallets",    href: "/pallets",   roles: ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE", "COORDINADOR", "CARGADOR", "PICKINERO"] },
  { icon: Shield,          label: "SAG",        href: "/sag",       roles: ["JEFE_DESPACHO", "SAG"] },
  { icon: FileText,        label: "Reportes",   href: "/reportes",  roles: ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE", "COORDINADOR", "SUPERVISOR"] },
];

interface SidebarProps {
  currentPath?: string;
}

export function Sidebar({ currentPath = "/dashboard" }: SidebarProps) {
  const [colapsado, setColapsado] = useState(false);
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? "";

  const elementosPlataforma = TODOS_LOS_ELEMENTOS.filter((e) =>
    e.roles.includes(rol)
  );

  return (
    <motion.aside
      className="h-screen bg-bg-surface border-r border-bg-elevated flex flex-col z-sidebar"
      animate={{ width: colapsado ? 56 : 230 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-bg-elevated">
        <div className="w-[34px] h-[34px] bg-accent rounded-md flex items-center justify-center shrink-0">
          <Truck size={20} className="text-white" />
        </div>
        {!colapsado && (
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

      {/* Elementos de navegación */}
      <nav className="flex-1 py-2">
        {elementosPlataforma.map((elemento) => (
          <SidebarItem
            key={elemento.href}
            {...elemento}
            active={currentPath === elemento.href}
            collapsed={colapsado}
          />
        ))}

        <div className="mx-4 my-2 border-t border-bg-elevated" />

        <SidebarItem
          icon={Settings}
          label="Configuración"
          href="/configuracion"
          active={currentPath === "/configuracion"}
          collapsed={colapsado}
        />
      </nav>

      {/* Botón de colapsar/expandir */}
      <button
        onClick={() => setColapsado(!colapsado)}
        className="flex items-center justify-center h-10 border-t border-bg-elevated text-text-muted hover:text-text-primary transition-colors"
        aria-label={colapsado ? "Expandir sidebar" : "Colapsar sidebar"}
      >
        {colapsado ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </motion.aside>
  );
}
