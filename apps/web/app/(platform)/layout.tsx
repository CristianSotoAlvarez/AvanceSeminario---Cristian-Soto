"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { BannerConexion } from "@/components/banner-conexion";
import { useAuth } from "@/hooks/use-auth";
import { AuthContext } from "@/lib/auth-context";

const titulosRuta: Record<string, string> = {
  "/dashboard":               "Tablero",
  "/camiones":                "Camiones",
  "/andenes":                 "Andenes",
  "/pallets":                 "Entregas",
  "/reportes":                "Reportes",
  "/sag":                     "SAG",
  "/configuracion/clientes":  "Clientes",
  "/configuracion":           "Configuración",
};

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, cargando } = useAuth();
  const tituloExacto = titulosRuta[pathname];
  const tituloParcial = !tituloExacto
    ? Object.entries(titulosRuta).find(([ruta]) => pathname.startsWith(ruta))?.[1]
    : undefined;
  const titulo = tituloExacto ?? tituloParcial ?? "Justo A Tiempo";

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
    <AuthContext.Provider value={{ usuario }}>
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPath={pathname} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={titulo} />
        <BannerConexion />
        <main className="flex-1 overflow-y-auto p-6 bg-bg-primary">
          {children}
        </main>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { fontFamily: "var(--font-display, sans-serif)", fontSize: "13px" },
          duration: 4000,
        }}
        richColors
      />
    </div>
    </AuthContext.Provider>
  );
}
