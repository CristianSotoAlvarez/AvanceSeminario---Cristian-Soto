"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@dispatch-track/ui";
import { Truck, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
  const router = useRouter();
  const { login, usuario, cargando } = useAuth();
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Si ya está autenticado, redirigir al dashboard
  useEffect(() => {
    if (!cargando && usuario) {
      router.push("/dashboard");
    }
  }, [cargando, usuario, router]);

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await login(identificador, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Credenciales inválidas");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-bg-primary via-bg-surface to-bg-elevated opacity-80" />

      <div className="relative z-10 w-full max-w-sm bg-bg-surface/90 backdrop-blur-lg border border-bg-elevated rounded-lg p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-accent rounded-xl flex items-center justify-center mb-4">
            <Truck size={32} className="text-text-primary" />
          </div>
          <h1 className="font-display text-h2 uppercase text-text-primary tracking-wider">
            DispatchTrack
          </h1>
          <p className="font-display text-caption text-text-muted mt-1">
            Sistema de Trazabilidad de Despacho
          </p>
        </div>

        <form onSubmit={manejarSubmit} className="space-y-5">
          <Input
            label="RUT o Email"
            placeholder="12.345.678-9"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="text-semantic-error text-sm text-center">{error}</p>
          )}

          <Button
            type="submit"
            size="lg-emphasis"
            className="w-full"
            disabled={enviando || !identificador || !password}
          >
            {enviando ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Ingresando...
              </span>
            ) : (
              "Iniciar Sesión"
            )}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-bg-elevated">
          <p className="text-text-muted text-xs text-center">
            Demo: <span className="text-text-primary">jefe@dispatch.cl</span> / <span className="text-text-primary">clave123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
