"use client";

import { useState, useEffect, useCallback } from "react";
import { listarTunelesApi, type TunelFrio } from "@/lib/api";

export function useTuneles() {
  const [tuneles, setTuneles] = useState<TunelFrio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await listarTunelesApi();
      setTuneles(datos);
    } catch (err: any) {
      setError(err.message || "Error al cargar túneles");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { tuneles, cargando, error, recargar: cargar };
}
