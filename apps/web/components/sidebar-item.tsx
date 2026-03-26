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
