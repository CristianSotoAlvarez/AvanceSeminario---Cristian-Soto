import { Button, Input } from "@dispatch-track/ui";
import { Truck } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary relative overflow-hidden">
      {/* Video placeholder — se reemplazará con video real */}
      <div className="absolute inset-0 bg-gradient-to-br from-bg-primary via-bg-surface to-bg-elevated opacity-80" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-sm bg-bg-surface/90 backdrop-blur-lg border border-bg-elevated rounded-lg p-8">
        {/* Logo */}
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

        {/* Form */}
        <form className="space-y-5">
          <Input label="RUT o Email" placeholder="12.345.678-9" />
          <Input label="Contraseña" type="password" placeholder="••••••••" />
          <Button size="lg-emphasis" className="w-full">
            Iniciar Sesión
          </Button>
        </form>
      </div>
    </div>
  );
}
