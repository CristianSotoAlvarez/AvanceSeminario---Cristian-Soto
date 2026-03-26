"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/camiones": "Camiones",
  "/andenes": "Andenes",
  "/pallets": "Pallets",
  "/reportes": "Reportes",
  "/sag": "SAG",
  "/configuracion": "Configuración",
};

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const title = routeTitles[pathname] || "DispatchTrack";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPath={pathname} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6 bg-bg-primary">
          {children}
        </main>
      </div>
    </div>
  );
}
