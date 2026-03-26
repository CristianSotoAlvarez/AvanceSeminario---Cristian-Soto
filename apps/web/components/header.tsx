"use client";

import { Bell, User } from "lucide-react";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="h-14 bg-bg-surface border-b border-bg-elevated flex items-center justify-between px-6 z-header">
      <h1 className="font-display text-h3 uppercase text-text-primary">
        {title}
      </h1>
      <div className="flex items-center gap-4">
        <button className="text-text-muted hover:text-text-primary transition-colors" aria-label="Notificaciones">
          <Bell size={18} />
        </button>
        <div className="w-8 h-8 rounded-md bg-bg-elevated flex items-center justify-center">
          <User size={16} className="text-text-muted" />
        </div>
      </div>
    </header>
  );
}
