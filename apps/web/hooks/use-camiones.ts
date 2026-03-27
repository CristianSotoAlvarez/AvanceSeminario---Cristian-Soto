"use client";

import { useState, useEffect, useCallback } from "react";
import { listarCamionesApi, type Camion } from "@/lib/api";

export function useCamiones(filtros?: { estado?: string; tipo?: string }) {
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await listarCamionesApi(filtros);
      setCamiones(datos);
    } catch (err: any) {
      setError(err.message || "Error al cargar camiones");
    } finally {
      setCargando(false);
    }
  }, [filtros?.estado, filtros?.tipo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { camiones, cargando, error, recargar: cargar };
}
