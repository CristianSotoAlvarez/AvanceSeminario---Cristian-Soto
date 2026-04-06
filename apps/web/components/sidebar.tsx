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
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { SidebarItem } from "./sidebar-item";
import { useAuth } from "@/hooks/use-auth";

const TODOS_LOS_ELEMENTOS = [
  // Platform
  { icon: LayoutDashboard, label: "Tablero",        href: "/dashboard",     roles: ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE", "COORDINADOR", "SUPERVISOR"] },
  { icon: Truck,           label: "Camiones",       href: "/camiones",      roles: ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE", "COORDINADOR", "SUPERVISOR"] },
  { icon: Warehouse,       label: "Andenes",        href: "/andenes",       roles: ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE", "COORDINADOR", "SUPERVISOR"] },
  { icon: Package,         label: "Entregas",       href: "/pallets",       roles: ["JEFE_DESPACHO", "COORDINADOR", "SUPERVISOR"] },
  { icon: Shield,          label: "SAG",            href: "/sag",           roles: ["JEFE_DESPACHO", "SUPERVISOR"] },
  { icon: FileText,        label: "Reportes",       href: "/reportes",               roles: ["JEFE_DESPACHO", "COORDINADOR", "SUPERVISOR"] },
  { icon: Users,           label: "Clientes",       href: "/configuracion/clientes",  roles: ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE"] },
  { icon: Package,         label: "Productos",      href: "/configuracion/productos", roles: ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE", "COORDINADOR"] },
  { icon: Settings,        label: "Configuración",  href: "/configuracion",           roles: ["JEFE_DESPACHO"] },
  // Operativo
  { icon: Package,         label: "Picking",        href: "/picking",       roles: ["PICKINERO", "SUPERVISOR"] },
  { icon: Truck,           label: "Carga",          href: "/carga",         roles: ["CARGADOR", "SUPERVISOR"] },
  { icon: Warehouse,       label: "Túnel Frío",     href: "/tunel",         roles: ["OPERADOR_TUNEL", "SUPERVISOR"] },
  // SAG portal
  { icon: Shield,          label: "Exportaciones",  href: "/exportaciones", roles: ["SAG"] },
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
      animate={{ width: colapsado ? 72 : 300 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      {/* Logo */}
      <div className={`flex items-center py-3 border-b border-bg-elevated ${colapsado ? "justify-center px-1" : "px-4"}`}>
        {colapsado ? (
          <img
            src="/logo-icon.png"
            alt="JAT"
            className="w-[58px] h-[58px] object-contain"
          />
        ) : (
          <motion.img
            src="/logo-full.png"
            alt="Justo A Tiempo"
            className="h-[60px] w-full object-contain object-left"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          />
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

        {elementosPlataforma.some(e => e.href === "/configuracion") && (
          <div className="mx-4 my-2 border-t border-bg-elevated" />
        )}
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
