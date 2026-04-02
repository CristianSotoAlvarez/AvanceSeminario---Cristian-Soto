"use client";

import { useState, useEffect, useCallback } from "react";
import { listarPalletsApi, type Pallet, type PaginaMeta } from "@/lib/api";

export function usePallets(filtros?: {
  estado?: string;
  edificioId?: string;
  entregaId?: string;
  fecha?: string;
  pagina?: number;
  porPagina?: number;
}) {
  const [pallets, setPallets]   = useState<Pallet[]>([]);
  const [meta, setMeta]         = useState<PaginaMeta>({ total: 0, pagina: 1, porPagina: 30, totalPaginas: 1 });
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resp = await listarPalletsApi(filtros);
      setPallets(resp.datos);
      setMeta(resp.meta);
    } catch (err: any) {
      setError(err.message || "Error al cargar pallets");
    } finally {
      setCargando(false);
    }
  }, [filtros?.estado, filtros?.edificioId, filtros?.entregaId, filtros?.fecha, filtros?.pagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { pallets, meta, cargando, error, recargar: cargar };
}
