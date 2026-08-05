"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Truck,
  Warehouse,
  Snowflake,
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

// Grupos visuales del sidebar (cada uno con título)
type SidebarItemDef = { icon: typeof LayoutDashboard; label: string; href: string; roles: string[] };
type SidebarGrupo = { titulo: string; elementos: SidebarItemDef[] };

const GRUPOS: SidebarGrupo[] = [
  {
    titulo: "Operación",
    elementos: [
      { icon: LayoutDashboard, label: "Tablero",   href: "/dashboard", roles: ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE", "COORDINADOR", "SUPERVISOR"] },
      { icon: Truck,           label: "Camiones",  href: "/camiones",  roles: ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE", "COORDINADOR", "SUPERVISOR"] },
      { icon: Truck,           label: "Portería",  href: "/porteria",  roles: ["PORTERO", "JEFE_DESPACHO", "SUPERVISOR", "COORDINADOR_TRANSPORTE", "COORDINADOR"] },
      { icon: Warehouse,       label: "Andenes",   href: "/andenes",   roles: ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE", "COORDINADOR", "SUPERVISOR"] },
      { icon: Snowflake,       label: "Túneles",   href: "/tuneles",   roles: ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE", "COORDINADOR", "SUPERVISOR", "OPERADOR_TUNEL"] },
      { icon: Package,         label: "Entregas",  href: "/pallets",   roles: ["JEFE_DESPACHO", "COORDINADOR", "SUPERVISOR"] },
    ],
  },
  {
    titulo: "Análisis",
    elementos: [
      { icon: FileText,        label: "Reportes",  href: "/reportes",  roles: ["JEFE_DESPACHO", "COORDINADOR", "SUPERVISOR"] },
    ],
  },
  {
    titulo: "Calidad",
    elementos: [
      { icon: Shield,          label: "SAG",       href: "/sag",       roles: ["JEFE_DESPACHO", "SUPERVISOR"] },
    ],
  },
  {
    titulo: "Operativo",
    elementos: [
      { icon: Package,         label: "Picking",       href: "/picking",       roles: ["PICKINERO", "SUPERVISOR"] },
      { icon: Truck,           label: "Carga",         href: "/carga",         roles: ["CARGADOR", "SUPERVISOR"] },
      { icon: Warehouse,       label: "Túnel Frío",    href: "/tunel",         roles: ["OPERADOR_TUNEL", "SUPERVISOR"] },
      { icon: Shield,          label: "Exportaciones", href: "/exportaciones", roles: ["SAG"] },
    ],
  },
  {
    titulo: "Configuración",
    elementos: [
      { icon: Users,           label: "Clientes",       href: "/configuracion/clientes",  roles: ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE"] },
      { icon: Package,         label: "Productos",      href: "/configuracion/productos", roles: ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE", "COORDINADOR"] },
      { icon: Settings,        label: "Configuración",  href: "/configuracion",           roles: ["JEFE_DESPACHO"] },
    ],
  },
];

interface SidebarProps {
  currentPath?: string;
}

function elementoVisible(elem: SidebarItemDef, rol: string, polivalente: boolean): boolean {
  if (elem.roles.includes(rol)) return true;
  if (polivalente) {
    if (rol === "PICKINERO" && elem.href === "/carga") return true;
    if (rol === "CARGADOR" && elem.href === "/picking") return true;
  }
  return false;
}

export function Sidebar({ currentPath = "/dashboard" }: SidebarProps) {
  const [colapsado, setColapsado] = useState(false);
  const { usuario } = useAuth();
  const rol = usuario?.rol ?? "";
  const polivalente = usuario?.polivalente ?? false;

  // Filtrar elementos por rol y aplanar grupos que quedan vacíos
  const gruposVisibles = GRUPOS
    .map(g => ({ titulo: g.titulo, elementos: g.elementos.filter(e => elementoVisible(e, rol, polivalente)) }))
    .filter(g => g.elementos.length > 0);

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

      {/* Elementos de navegación agrupados por función */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {gruposVisibles.map((grupo, idx) => (
          <div key={grupo.titulo} className={idx > 0 ? "mt-3" : ""}>
            {!colapsado && (
              <p className="px-4 mt-2 mb-1 font-display text-[9px] font-bold uppercase tracking-widest text-text-muted/70">
                {grupo.titulo}
              </p>
            )}
            {colapsado && idx > 0 && (
              <div className="mx-4 my-2 border-t border-bg-elevated" />
            )}
            {grupo.elementos.map(elemento => (
              <SidebarItem
                key={elemento.href}
                {...elemento}
                active={currentPath === elemento.href}
                collapsed={colapsado}
              />
            ))}
          </div>
        ))}
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
