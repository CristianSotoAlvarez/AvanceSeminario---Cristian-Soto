"use client";

import { LogOut, Search, Truck, Users, Package, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { buscarApi, type ResultadoBusqueda } from "@/lib/api";
import { etiquetasEstado, etiquetasTipo } from "@/lib/camion-config";

const etiquetasRol: Record<string, string> = {
  JEFE_DESPACHO: "Jefe de Despacho",
  COORDINADOR_TRANSPORTE: "Coord. Transporte",
  COORDINADOR: "Coordinador",
  PICKINERO: "Pickinero",
  CARGADOR: "Cargador",
  SUPERVISOR: "Supervisor",
  OPERADOR_TUNEL: "Operador Túnel",
  SAG: "Inspector SAG",
  PORTERO: "Portería",
};

function BusquedaGlobal() {
  const router  = useRouter();
  const [q, setQ]                     = useState("");
  const [resultados, setResultados]   = useState<ResultadoBusqueda | null>(null);
  const [buscando, setBuscando]       = useState(false);
  const [abierto, setAbierto]         = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const buscar = useCallback(async (termino: string) => {
    if (termino.length < 2) { setResultados(null); return; }
    setBuscando(true);
    try {
      const res = await buscarApi(termino);
      setResultados(res);
      setAbierto(true);
    } catch {
      setResultados(null);
    } finally {
      setBuscando(false);
    }
  }, []);

  // Debounce 300ms
  useEffect(() => {
    if (!q) { setResultados(null); setAbierto(false); return; }
    const t = setTimeout(() => buscar(q), 300);
    return () => clearTimeout(t);
  }, [q, buscar]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hayResultados = resultados && (
    resultados.camiones.length + resultados.clientes.length + resultados.pallets.length > 0
  );

  function navegar(path: string) {
    setQ(''); setAbierto(false); router.push(path);
  }

  return (
    <div ref={contenedorRef} className="relative">
      <div className="flex items-center gap-2 bg-bg-elevated rounded-lg px-3 py-1.5 w-56 border border-transparent focus-within:border-accent/40 transition-colors">
        <Search size={13} className="text-text-muted flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => q.length >= 2 && setAbierto(true)}
          placeholder="Buscar..."
          className="bg-transparent text-xs font-display text-text-primary placeholder:text-text-muted outline-none flex-1 w-0"
        />
        {q && (
          <button onClick={() => { setQ(''); setAbierto(false); }} className="text-text-muted hover:text-text-primary">
            <X size={11} />
          </button>
        )}
        {buscando && <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />}
      </div>

      {abierto && (
        <div className="absolute top-full mt-1 right-0 w-80 bg-bg-surface border border-bg-elevated rounded-xl shadow-xl z-50 overflow-hidden">
          {!hayResultados ? (
            <p className="text-xs text-text-muted font-display p-4 text-center">Sin resultados para "{q}"</p>
          ) : (
            <div className="divide-y divide-bg-elevated max-h-80 overflow-y-auto">
              {/* Camiones */}
              {resultados!.camiones.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 px-3 pt-2.5 pb-1 font-display text-[9px] uppercase tracking-widest text-text-muted">
                    <Truck size={10} /> Camiones
                  </p>
                  {resultados!.camiones.map(c => (
                    <button
                      key={c.id}
                      onClick={() => navegar(`/camiones/${c.id}`)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-elevated transition-colors text-left"
                    >
                      <div>
                        <p className="font-data text-xs font-bold text-text-primary">
                          {c.numeroTransporte ?? c.patente}
                        </p>
                        <p className="font-display text-[10px] text-text-muted">
                          {etiquetasTipo[c.tipo] ?? c.tipo}{c.cliente ? ` · ${c.cliente.nombre}` : ''}
                        </p>
                      </div>
                      <span className="font-display text-[9px] px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted">
                        {etiquetasEstado[c.estado] ?? c.estado}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Clientes */}
              {resultados!.clientes.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 px-3 pt-2.5 pb-1 font-display text-[9px] uppercase tracking-widest text-text-muted">
                    <Users size={10} /> Clientes
                  </p>
                  {resultados!.clientes.map(c => (
                    <button
                      key={c.id}
                      onClick={() => navegar(`/configuracion/clientes`)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-elevated transition-colors text-left"
                    >
                      <div>
                        <p className="font-display text-xs font-medium text-text-primary">{c.nombre}</p>
                        <p className="font-display text-[10px] text-text-muted">
                          {c.codigo ?? ''}{c.pais ? ` · ${c.pais}` : ''}
                        </p>
                      </div>
                      <span className="font-data text-[9px] text-text-muted">{c._count.camiones} camiones</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Pallets */}
              {resultados!.pallets.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 px-3 pt-2.5 pb-1 font-display text-[9px] uppercase tracking-widest text-text-muted">
                    <Package size={10} /> Pallets
                  </p>
                  {resultados!.pallets.map(p => (
                    <button
                      key={p.id}
                      onClick={() => navegar(`/pallets/${p.id}`)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-elevated transition-colors text-left"
                    >
                      <p className="font-data text-xs text-text-primary">{p.codigoUnico}</p>
                      <span className="font-display text-[9px] px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted">
                        {p.estado}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { usuario, logout } = useAuth();
  const router = useRouter();

  async function manejarLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="h-14 bg-bg-surface border-b border-bg-elevated flex items-center justify-between px-6 z-header no-print">
      <div className="flex items-center gap-4">
        <h1 className="font-display text-[13px] font-bold uppercase tracking-widest text-text-primary">
          {title}
        </h1>
        {/* Indicador En Vivo */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F0FDF4] border border-[#BBF7D0]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#16A34A]" />
          </span>
          <span className="font-display text-[9px] font-bold uppercase tracking-widest text-[#16A34A]">En Vivo</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <BusquedaGlobal />

        {usuario && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-display text-xs font-semibold text-text-primary leading-tight">
                {usuario.nombre}
              </p>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="font-display text-[10px] text-text-muted leading-tight">
                  {etiquetasRol[usuario.rol] || usuario.rol}
                </span>
                {usuario.polivalente && (
                  <span
                    title="Operador polivalente: puede armar y cargar"
                    className="font-display text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200"
                  >
                    Polivalente
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={manejarLogout}
              className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center text-text-muted hover:text-semantic-error transition-colors cursor-pointer"
              aria-label="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
