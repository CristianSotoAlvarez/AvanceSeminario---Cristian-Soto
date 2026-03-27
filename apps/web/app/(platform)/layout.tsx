"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { useAuth } from "@/hooks/use-auth";

const titulosRuta: Record<string, string> = {
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
  const router = useRouter();
  const { usuario, cargando } = useAuth();
  const titulo = titulosRuta[pathname] || "DispatchTrack";

  useEffect(() => {
    if (!cargando && !usuario) {
      router.push("/login");
    }
  }, [cargando, usuario, router]);

  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="text-text-muted font-display">Cargando...</div>
      </div>
    );
  }

  if (!usuario) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPath={pathname} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={titulo} />
        <main className="flex-1 overflow-y-auto p-6 bg-bg-primary">
          {children}
        </main>
      </div>
    </div>
  );
}
