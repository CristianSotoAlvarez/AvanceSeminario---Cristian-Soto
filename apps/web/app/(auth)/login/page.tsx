"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@dispatch-track/ui";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const esquemaLogin = z.object({
  identificador: z.string().min(1, "Ingresa tu RUT o email"),
  password:      z.string().min(1, "Ingresa tu contraseña"),
});

const FADE = 3; // duración del crossfade en segundos

function VideoFondo() {
  const videoA = useRef<HTMLVideoElement>(null);
  const videoB = useRef<HTMLVideoElement>(null);
  const [opacidadA, setOpacidadA] = useState(1);
  const [opacidadB, setOpacidadB] = useState(0);
  const turno = useRef<"a" | "b">("a");
  const fadeando = useRef(false);

  useEffect(() => {
    const a = videoA.current;
    const b = videoB.current;
    if (!a || !b) return;

    const intervalo = setInterval(() => {
      if (fadeando.current) return;

      const activo = turno.current === "a" ? a : b;
      if (!activo.duration) return;

      const restante = activo.duration - activo.currentTime;
      if (restante > FADE) return;

      fadeando.current = true;

      if (turno.current === "a") {
        b.currentTime = 0;
        b.play().catch(() => {});
        setOpacidadA(0);
        setOpacidadB(1);
        turno.current = "b";
      } else {
        a.currentTime = 0;
        a.play().catch(() => {});
        setOpacidadA(1);
        setOpacidadB(0);
        turno.current = "a";
      }

      setTimeout(() => { fadeando.current = false; }, (FADE + 0.5) * 1000);
    }, 200);

    return () => clearInterval(intervalo);
  }, []);

  return (
    <>
      <video
        ref={videoA}
        autoPlay
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: opacidadA, transition: `opacity ${FADE}s ease-in-out` }}
      >
        <source src="/bg-login.mp4" type="video/mp4" />
      </video>
      <video
        ref={videoB}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: opacidadB, transition: `opacity ${FADE}s ease-in-out` }}
      >
        <source src="/bg-login.mp4" type="video/mp4" />
      </video>
    </>
  );
}

type FormLogin = z.infer<typeof esquemaLogin>;

export default function LoginPage() {
  const router = useRouter();
  const { login, usuario, cargando } = useAuth();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormLogin>({
    resolver: zodResolver(esquemaLogin),
  });

  function rutaInicialPorRol(rol: string): string {
    if (rol === "PORTERO") return "/porteria";
    if (rol === "PICKINERO") return "/picking";
    if (rol === "CARGADOR") return "/carga";
    if (rol === "OPERADOR_TUNEL") return "/tunel";
    if (rol === "SAG") return "/exportaciones";
    return "/dashboard";
  }

  useEffect(() => {
    if (!cargando && usuario) router.push(rutaInicialPorRol(usuario.rol));
  }, [cargando, usuario, router]);

  async function manejarSubmit(datos: FormLogin) {
    setErrorServidor(null);
    try {
      const respuesta = await login(datos.identificador, datos.password);
      router.push(rutaInicialPorRol(respuesta.usuario.rol));
    } catch (err: unknown) {
      setErrorServidor(err instanceof Error ? err.message : "Credenciales inválidas");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Video de fondo con crossfade */}
      <VideoFondo />

      {/* Overlay oscuro sobre el video */}
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 w-full max-w-sm bg-white/70 backdrop-blur-md border border-white/30 rounded-xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo-full.png"
            alt="Justo A Tiempo"
            className="w-full object-contain mb-1"
          />
        </div>

        <form onSubmit={handleSubmit(manejarSubmit)} className="space-y-5">
          <div className="flex flex-col gap-1">
            <label className="font-display text-xs font-semibold text-slate-700">RUT o Email</label>
            <input
              {...register("identificador")}
              placeholder="12.345.678-9"
              autoComplete="username"
              className={`h-10 px-3 rounded-lg border text-sm outline-none transition-colors bg-white/60 ${
                errors.identificador ? "border-red-400 focus:border-red-500" : "border-white/50 focus:border-[#EA580C]/60"
              }`}
            />
            {errors.identificador && (
              <p className="text-xs text-red-500">{errors.identificador.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-display text-xs font-semibold text-slate-700">Contraseña</label>
            <input
              {...register("password")}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              className={`h-10 px-3 rounded-lg border text-sm outline-none transition-colors bg-white/60 ${
                errors.password ? "border-red-400 focus:border-red-500" : "border-white/50 focus:border-[#EA580C]/60"
              }`}
            />
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {errorServidor && (
            <p className="text-red-600 text-sm text-center bg-red-50/80 rounded-lg py-2 px-3">{errorServidor}</p>
          )}

          <Button
            type="submit"
            size="lg-emphasis"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Ingresando...
              </span>
            ) : (
              "Iniciar Sesión"
            )}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-blue-100">
          <p className="text-text-muted text-xs text-center">
            Demo: <span className="text-text-primary">jefe@dispatch.cl</span> / <span className="text-text-primary">clave123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
