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
