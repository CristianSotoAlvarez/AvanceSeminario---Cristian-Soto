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
  darkBg?: boolean;
}

export function SidebarItem({ icon: Icon, label, href, active, collapsed, darkBg }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 h-10 transition-colors",
        collapsed
          ? cn(
              "justify-center mx-auto w-[38px] rounded-md",
              active
                ? "bg-accent/[0.12] text-accent"
                : "text-text-muted hover:bg-bg-elevated/60 hover:text-text-primary"
            )
          : cn(
              "px-4 py-2",
              active
                ? "bg-accent/[0.08] text-accent border-l-[3px] border-l-accent"
                : "text-text-muted hover:bg-bg-elevated/60 hover:text-text-primary"
            )
      )}
      title={collapsed ? label : undefined}
    >
      <Icon size={22} />
      {!collapsed && (
        <span className="font-display text-[12px] uppercase tracking-[0.5px] font-medium">
          {label}
        </span>
      )}
    </Link>
  );
}
