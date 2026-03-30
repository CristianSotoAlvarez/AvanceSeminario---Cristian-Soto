"use client";

import { useState, useEffect, useCallback } from "react";
import { listarAndenesApi, type Anden } from "@/lib/api";

export function useAndenes() {
  const [andenes, setAndenes] = useState<Anden[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await listarAndenesApi();
      setAndenes(datos);
    } catch (err: any) {
      setError(err.message || "Error al cargar andenes");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { andenes, cargando, error, recargar: cargar };
}
