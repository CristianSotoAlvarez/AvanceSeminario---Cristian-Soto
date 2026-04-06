"use client";

import { useState, useEffect, useCallback } from "react";
import { listarCamionesApi, type Camion, type PaginaMeta } from "@/lib/api";

function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useCamiones(filtros?: {
  estado?: string;
  tipo?: string;
  fecha?: string;
  pagina?: number;
  porPagina?: number;
}) {
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [meta, setMeta] = useState<PaginaMeta>({ total: 0, pagina: 1, porPagina: 30, totalPaginas: 1 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resp = await listarCamionesApi({
        ...filtros,
        fecha: filtros?.fecha ?? hoy(),
      });
      setCamiones(resp.datos);
      setMeta(resp.meta);
    } catch (err: any) {
      setError(err.message || "Error al cargar camiones");
    } finally {
      setCargando(false);
    }
  }, [filtros?.estado, filtros?.tipo, filtros?.fecha, filtros?.pagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { camiones, meta, cargando, error, recargar: cargar };
}
