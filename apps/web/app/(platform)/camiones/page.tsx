"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Badge,
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
} from "@dispatch-track/ui";
import { TruckState, TRUCK_STATE_COLOR } from "@dispatch-track/types";
import { Plus, X, AlertTriangle, ChevronRight, ChevronLeft, Calendar, SlidersHorizontal, Check, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useEffect } from "react";
import { BotonActualizar } from "@/components/boton-actualizar";
import { useCamiones } from "@/hooks/use-camiones";
import { useSocketCamiones } from "@/hooks/use-socket";
import { crearCamionApi, listarClientesApi, listarProductosApi, setItemsEntregaApi, Cliente, ParadaDatos, Producto, CamionDetalle } from "@/lib/api";
import { etiquetasEstado, etiquetasTipo } from "@/lib/camion-config";
import { formatearHora, minutosAtraso, formatearAtraso } from "@/lib/formato";

// ─── Modal: Crear camión ─────────────────────────────────────────────────────

const EDIFICIOS_CONFIG = [
  { tipo: "AVES",        label: "Aves",        color: "#B45309", bg: "#FEF3C7", border: "#FDE68A" },
  { tipo: "CERDO",       label: "Cerdo",        color: "#BE185D", bg: "#FFE4E6", border: "#FECDD3" },
  { tipo: "FRIGORIFICO", label: "Frigorífico",  color: "#0E7490", bg: "#CFFAFE", border: "#A5F3FC" },
];

// Ítem de producto por parada en el formulario
interface ItemProductoForm { productoId: string; cantidadSolicitada: number }

function ModalCrearCamion({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: () => void }) {
  const [patente, setPatente]     = useState("");
  const [tipo, setTipo]           = useState("NACIONAL");
  const [clienteId, setClienteId] = useState("");
  const [clientes, setClientes]   = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [horaLlegada, setHoraLlegada] = useState("");
  const [horaSalida, setHoraSalida]   = useState("");
  const [paradas, setParadas]     = useState<ParadaDatos[]>([]);
  // productosPorParada: edificio → lista de items
  const [productosPorParada, setProductosPorParada] = useState<Record<string, ItemProductoForm[]>>({});
  const [enviando, setEnviando]   = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    listarClientesApi().then(setClientes).catch(() => {});
    listarProductosApi().then(setProductos).catch(() => {});
  }, []);

  function agregarItemParada(edificio: string) {
    setProductosPorParada(prev => ({
      ...prev,
      [edificio]: [...(prev[edificio] ?? []), { productoId: "", cantidadSolicitada: 1 }],
    }));
  }

  function actualizarItemParada(edificio: string, idx: number, campo: keyof ItemProductoForm, valor: string | number) {
    setProductosPorParada(prev => ({
      ...prev,
      [edificio]: (prev[edificio] ?? []).map((item, i) => i === idx ? { ...item, [campo]: valor } : item),
    }));
  }

  function quitarItemParada(edificio: string, idx: number) {
    setProductosPorParada(prev => ({
      ...prev,
      [edificio]: (prev[edificio] ?? []).filter((_, i) => i !== idx),
    }));
  }

  function toggleEdificio(edificio: string) {
    setParadas((prev) => {
      const existe = prev.find(p => p.edificio === edificio);
      if (existe) return prev.filter(p => p.edificio !== edificio);
      const sinFrio = prev.filter(p => p.edificio !== "FRIGORIFICO");
      const nueva: ParadaDatos = { edificio, pallets: undefined };
      return edificio === "FRIGORIFICO"
        ? [...sinFrio, nueva]
        : [...sinFrio, nueva, ...prev.filter(p => p.edificio === "FRIGORIFICO")];
    });
  }

  function setPallets(edificio: string, valor: string) {
    const n = parseInt(valor);
    setParadas(prev => prev.map(p =>
      p.edificio === edificio ? { ...p, pallets: isNaN(n) || n < 0 ? undefined : n } : p
    ));
  }

  // Ruta ordenada (frigorífico siempre al final)
  const rutaOrdenada = [
    ...paradas.filter(p => p.edificio !== "FRIGORIFICO"),
    ...paradas.filter(p => p.edificio === "FRIGORIFICO"),
  ];

  const totalPallets = paradas.reduce((s, p) => s + (p.pallets ?? 0), 0);

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const camion = await crearCamionApi({
        patente:               patente.toUpperCase() || undefined,
        tipo,
        clienteId:             clienteId || undefined,
        horaLlegadaPlanificada: new Date(horaLlegada).toISOString(),
        horaSalidaPlanificada:  horaSalida ? new Date(horaSalida).toISOString() : undefined,
        paradas:               rutaOrdenada.length > 0 ? rutaOrdenada : undefined,
      }) as CamionDetalle & { entregas?: { id: string; parada?: { edificioTipo: string } | null }[] };

      // Asignar productos a cada entrega según el edificio
      if (camion.entregas) {
        for (const entrega of camion.entregas) {
          const edificio = entrega.parada?.edificioTipo;
          if (!edificio) continue;
          const items = (productosPorParada[edificio] ?? []).filter(i => i.productoId && i.cantidadSolicitada > 0);
          if (items.length > 0) {
            await setItemsEntregaApi(entrega.id, items);
          }
        }
      }

      onCreado();
      onCerrar();
    } catch (err: any) {
      setError(err.message || "Error al crear camión");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(30,58,138,0.25)", backdropFilter: "blur(4px)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
    >
      <motion.div
        className="bg-bg-surface rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col"
        style={{ border: "1px solid rgba(30,58,95,0.15)" }}
        initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }} transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {/* Header navy */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ background: "#1E3A5F" }}>
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-white">Nuevo Camión</h2>
          <button onClick={onCerrar} className="transition-colors cursor-pointer" style={{ color: "rgba(255,255,255,0.5)" }} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={manejarSubmit} className="space-y-4 p-6 overflow-y-auto">
          {/* Patente */}
          <Input label="Patente (opcional)" placeholder="BXRK-42" value={patente} onChange={(e) => setPatente(e.target.value)} />

          {/* Tipo */}
          <div className="flex flex-col gap-1.5">
            <label className="font-display text-label uppercase text-text-muted tracking-wide">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="h-10 px-3 rounded-sm border border-bg-elevated bg-bg-surface text-text-primary font-display text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
            >
              <option value="NACIONAL">Nacional</option>
              <option value="EXPORTACION">Exportación</option>
              <option value="INTERPLANTA">Interplanta</option>
            </select>
          </div>

          {/* Cliente */}
          <div className="flex flex-col gap-1.5">
            <label className="font-display text-label uppercase text-text-muted tracking-wide">Cliente</label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="h-10 px-3 rounded-sm border border-bg-elevated bg-bg-surface text-text-primary font-display text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
            >
              <option value="">— Sin cliente —</option>
              {(["NACIONAL", "INTERPLANTA", "EXPORTACION"] as const).map(t => {
                const grupo = clientes.filter(c => c.tipoDestino === t);
                if (grupo.length === 0) return null;
                const label = t === "NACIONAL" ? "Nacional" : t === "INTERPLANTA" ? "Interplanta" : "Exportación";
                return (
                  <optgroup key={t} label={label}>
                    {grupo.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.codigo ? `[${c.codigo}] ` : ""}{c.nombre}{c.pais ? ` · ${c.pais}` : ""}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* Puntos de expedición + pallets */}
          <div className="flex flex-col gap-2">
            <label className="font-display text-label uppercase text-text-muted tracking-wide">
              Puntos de expedición
              {totalPallets > 0 && (
                <span className="ml-2 normal-case text-accent font-semibold">{totalPallets} pallets total</span>
              )}
            </label>

            {/* Botones de selección */}
            <div className="flex gap-2">
              {EDIFICIOS_CONFIG.map((edif) => {
                const sel = paradas.some(p => p.edificio === edif.tipo);
                return (
                  <button
                    key={edif.tipo}
                    type="button"
                    onClick={() => toggleEdificio(edif.tipo)}
                    className="flex-1 py-2 rounded-lg border-2 font-display text-xs uppercase tracking-wide transition-all duration-150 cursor-pointer"
                    style={{
                      borderColor: sel ? edif.color : "#E2E8F0",
                      background:  sel ? edif.bg    : "#F8FAFC",
                      color:       sel ? edif.color : "#94A3B8",
                      fontWeight:  sel ? 700 : 400,
                    }}
                  >
                    {sel && <Check size={10} className="inline mr-1" />}
                    {edif.label}
                  </button>
                );
              })}
            </div>

            {/* Detalle de pallets + productos por parada */}
            {rutaOrdenada.length > 0 && (
              <div className="rounded-lg border border-bg-elevated overflow-hidden">
                <div className="bg-bg-elevated/50 px-3 py-1.5">
                  <span className="font-display text-[10px] text-text-muted uppercase tracking-wide">Ruta, pallets y productos por parada</span>
                </div>
                {rutaOrdenada.map((p, i) => {
                  const cfg = EDIFICIOS_CONFIG.find(x => x.tipo === p.edificio)!;
                  const itemsParada = productosPorParada[p.edificio] ?? [];
                  return (
                    <div key={p.edificio} className="border-t border-bg-elevated first:border-t-0">
                      {/* Fila pallets */}
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <span className="font-data text-[10px] text-text-muted w-4 text-center">{i + 1}</span>
                        <span className="font-display text-xs font-bold uppercase px-2 py-0.5 rounded flex-1"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                          {cfg.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input type="number" min={0} placeholder="0" value={p.pallets ?? ""}
                            onChange={e => setPallets(p.edificio, e.target.value)}
                            className="w-20 h-8 px-2 text-right rounded border border-bg-elevated bg-bg-surface font-data text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30" />
                          <span className="font-display text-[10px] text-text-muted">pallets</span>
                        </div>
                        <button type="button" onClick={() => toggleEdificio(p.edificio)}
                          className="text-text-muted hover:text-semantic-error transition-colors cursor-pointer">
                          <X size={14} />
                        </button>
                      </div>

                      {/* Productos de la parada */}
                      {productos.length > 0 && (
                        <div className="px-3 pb-2.5 space-y-1.5" style={{ background: `${cfg.bg}80` }}>
                          {itemsParada.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <select value={item.productoId}
                                onChange={e => actualizarItemParada(p.edificio, idx, "productoId", e.target.value)}
                                className="flex-1 h-8 px-2 rounded border border-bg-elevated bg-bg-surface font-display text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer">
                                <option value="">— Producto —</option>
                                {productos.map(prod => (
                                  <option key={prod.id} value={prod.id}>{prod.nombre} ({prod.unidadMedida})</option>
                                ))}
                              </select>
                              <input type="number" min={1} value={item.cantidadSolicitada}
                                onChange={e => actualizarItemParada(p.edificio, idx, "cantidadSolicitada", parseInt(e.target.value) || 1)}
                                className="w-20 h-8 px-2 text-right rounded border border-bg-elevated bg-bg-surface font-data text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                              <button type="button" onClick={() => quitarItemParada(p.edificio, idx)}
                                className="text-text-muted hover:text-semantic-error transition-colors cursor-pointer">
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          <button type="button" onClick={() => agregarItemParada(p.edificio)}
                            className="flex items-center gap-1 font-display text-[10px] uppercase tracking-wide transition-colors cursor-pointer"
                            style={{ color: cfg.color }}>
                            <Plus size={10} /> Agregar producto
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {totalPallets > 0 && (
                  <div className="px-3 py-2 bg-accent/5 border-t border-bg-elevated flex justify-between items-center">
                    <span className="font-display text-xs text-text-muted">Total solicitado</span>
                    <span className="font-data text-sm font-bold text-accent">{totalPallets} pallets</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <Input label="Hora de llegada planificada" type="datetime-local" value={horaLlegada} onChange={(e) => setHoraLlegada(e.target.value)} required />
          <Input label="Hora de salida planificada (opcional)" type="datetime-local" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} />

          {error && <p className="text-semantic-error text-sm text-center">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onCerrar}>Cancelar</Button>
            <button
              type="submit"
              disabled={enviando || !horaLlegada}
              className="flex-1 h-10 rounded-md font-display text-sm font-bold text-white uppercase tracking-wide transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#EA580C" }}
            >
              {enviando ? "Creando..." : "Crear Camión"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

// ─── Dropdown de filtros ──────────────────────────────────────────────────────

function DropdownFiltros({
  estados, tipos, filtroEstado, filtroTipo, onEstado, onTipo,
}: {
  estados: string[]; tipos: string[];
  filtroEstado?: string; filtroTipo?: string;
  onEstado: (v: string | undefined) => void;
  onTipo: (v: string | undefined) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activos = (filtroEstado ? 1 : 0) + (filtroTipo ? 1 : 0);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAbierto(v => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border font-display text-sm transition-all cursor-pointer ${
          abierto || activos > 0
            ? "bg-accent text-white border-accent"
            : "bg-bg-surface border-bg-elevated text-text-primary hover:border-accent/40"
        }`}
      >
        <SlidersHorizontal size={14} />
        Filtros
        {activos > 0 && (
          <span className="bg-white/25 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {activos}
          </span>
        )}
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full mt-2 z-50 bg-bg-surface border border-bg-elevated rounded-xl shadow-xl p-4 min-w-[320px]"
          >
            {/* Estado */}
            <p className="font-display text-[10px] uppercase text-text-muted tracking-widest mb-2">Estado</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              <button
                onClick={() => onEstado(undefined)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-display transition-all cursor-pointer border ${
                  !filtroEstado ? "bg-accent text-white border-accent" : "border-bg-elevated text-text-muted hover:border-accent/30 hover:text-text-primary"
                }`}
              >
                {!filtroEstado && <Check size={10} />} Todos
              </button>
              {estados.map(e => (
                <button
                  key={e}
                  onClick={() => onEstado(filtroEstado === e ? undefined : e)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-display transition-all cursor-pointer border ${
                    filtroEstado === e ? "bg-accent text-white border-accent" : "border-bg-elevated text-text-muted hover:border-accent/30 hover:text-text-primary"
                  }`}
                >
                  {filtroEstado === e && <Check size={10} />}
                  {etiquetasEstado[e]}
                </button>
              ))}
            </div>

            {/* Tipo */}
            <p className="font-display text-[10px] uppercase text-text-muted tracking-widest mb-2">Tipo</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              <button
                onClick={() => onTipo(undefined)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-display transition-all cursor-pointer border ${
                  !filtroTipo ? "bg-accent text-white border-accent" : "border-bg-elevated text-text-muted hover:border-accent/30 hover:text-text-primary"
                }`}
              >
                {!filtroTipo && <Check size={10} />} Todos
              </button>
              {tipos.map(t => (
                <button
                  key={t}
                  onClick={() => onTipo(filtroTipo === t ? undefined : t)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-display transition-all cursor-pointer border ${
                    filtroTipo === t ? "bg-accent text-white border-accent" : "border-bg-elevated text-text-muted hover:border-accent/30 hover:text-text-primary"
                  }`}
                >
                  {filtroTipo === t && <Check size={10} />}
                  {etiquetasTipo[t]}
                </button>
              ))}
            </div>

            {/* Limpiar */}
            {activos > 0 && (
              <button
                onClick={() => { onEstado(undefined); onTipo(undefined); setAbierto(false); }}
                className="w-full text-center font-display text-xs text-semantic-error hover:underline cursor-pointer pt-1"
              >
                Limpiar filtros
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function fechaHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatearFechaBonita(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
}

export default function CamionesPage() {
  const router = useRouter();
  const [filtroEstado, setFiltroEstado] = useState<string | undefined>();
  const [filtroTipo, setFiltroTipo] = useState<string | undefined>();
  const [fecha, setFecha] = useState<string>(fechaHoy());
  const [pagina, setPagina] = useState(1);
  const { camiones, meta, cargando, recargar } = useCamiones({
    estado: filtroEstado,
    tipo: filtroTipo,
    fecha,
    pagina,
  });
  const [mostrarModal, setMostrarModal] = useState(false);

  // Reset página al cambiar filtros o fecha
  function cambiarFecha(nueva: string) { setFecha(nueva); setPagina(1); }
  function cambiarEstado(e: string | undefined) { setFiltroEstado(e); setPagina(1); }
  function cambiarTipo(t: string | undefined) { setFiltroTipo(t); setPagina(1); }

  function irDiaAnterior() { cambiarFecha(new Date(new Date(fecha).getTime() - 86400000).toISOString().slice(0, 10)); }
  function irDiaSiguiente() { cambiarFecha(new Date(new Date(fecha).getTime() + 86400000).toISOString().slice(0, 10)); }
  const esHoy = fecha === fechaHoy();

  const handleActualizado = useCallback(() => { recargar(); }, [recargar]);
  useSocketCamiones(handleActualizado);

  const ESTADOS = Object.keys(etiquetasEstado);
  const TIPOS = Object.keys(etiquetasTipo);

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {mostrarModal && (
          <ModalCrearCamion onCerrar={() => setMostrarModal(false)} onCreado={recargar} />
        )}
      </AnimatePresence>

      {/* Selector de fecha + acciones */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Navegador de fecha */}
        <div className="flex items-center gap-1 bg-bg-surface border border-bg-elevated rounded-lg p-1">
          <button onClick={irDiaAnterior} className="p-1.5 rounded hover:bg-bg-elevated transition-colors cursor-pointer">
            <ChevronLeft size={15} className="text-text-muted" />
          </button>
          <div className="flex items-center gap-2 px-2">
            <Calendar size={13} className="text-text-muted" />
            <span className="font-display text-sm text-text-primary capitalize min-w-[110px] text-center">
              {esHoy ? "Hoy" : formatearFechaBonita(fecha)}
            </span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => cambiarFecha(e.target.value)}
              className="absolute opacity-0 w-0 h-0"
              id="fecha-input"
            />
            <label htmlFor="fecha-input" className="cursor-pointer text-text-muted hover:text-text-primary transition-colors">
              <Calendar size={12} />
            </label>
          </div>
          <button
            onClick={irDiaSiguiente}
            disabled={esHoy}
            className="p-1.5 rounded hover:bg-bg-elevated transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={15} className="text-text-muted" />
          </button>
          {!esHoy && (
            <button
              onClick={() => cambiarFecha(fechaHoy())}
              className="ml-1 px-2 py-1 text-[10px] font-display uppercase tracking-wide text-accent hover:bg-accent/10 rounded transition-colors cursor-pointer"
            >
              Hoy
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <BotonActualizar onClick={recargar} />
          <Button size="sm" onClick={() => setMostrarModal(true)}>
            <Plus size={14} className="mr-1" /> Nuevo Camión
          </Button>
        </div>
      </div>

      {/* Dropdown de filtros */}
      <DropdownFiltros
        estados={ESTADOS}
        tipos={TIPOS}
        filtroEstado={filtroEstado}
        filtroTipo={filtroTipo}
        onEstado={cambiarEstado}
        onTipo={cambiarTipo}
      />

      {/* Tabla */}
      {cargando ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : camiones.length === 0 ? (
        <div className="text-center py-12 text-text-muted font-display">
          No hay camiones con los filtros seleccionados
        </div>
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>N° Transporte</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Andén</TableHead>
              <TableHead>Llegada plan.</TableHead>
              <TableHead>Salida plan.</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </tr>
          </TableHeader>
          <TableBody>
            {camiones.map((camion, i) => {
              const atrasado =
                !!camion.horaSalidaPlanificada &&
                camion.estado !== "DESPACHADO" &&
                new Date(camion.horaSalidaPlanificada) < new Date();
              return (
                <motion.tr
                  key={camion.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.035, ease: "easeOut" }}
                  onClick={() => router.push(`/camiones/${camion.id}`)}
                  className="border-b border-bg-elevated transition-colors duration-150 cursor-pointer group hover:bg-[#FFF7F5]"
                  style={atrasado ? { background: "#FFF1F2" } : {}}
                >
                  <TableCell className="font-semibold">
                    <span className="flex items-center gap-2">
                      <span className="w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "#EA580C" }} />
                      {atrasado && <AlertTriangle size={12} className="text-semantic-error flex-shrink-0" />}
                      {camion.numeroTransporte ?? camion.patente}
                    </span>
                  </TableCell>
                  <TableCell className="font-display text-text-muted">{etiquetasTipo[camion.tipo] || camion.tipo}</TableCell>
                  <TableCell className="font-display">
                    {camion.cliente?.nombre || camion.pedido?.cliente?.nombre || "—"}
                    {camion.cliente?.pais && (
                      <span className="ml-1 text-xs text-slate-400">({camion.cliente.pais})</span>
                    )}
                  </TableCell>
                  <TableCell>{camion.anden?.codigo || "—"}</TableCell>
                  <TableCell className="font-data">{formatearHora(camion.horaLlegadaPlanificada)}</TableCell>
                  <TableCell className="font-data">
                    {camion.horaSalidaPlanificada ? (
                      <span style={atrasado ? { color: "#DC2626", fontWeight: 700 } : {}}>
                        {formatearHora(camion.horaSalidaPlanificada)}
                        {atrasado && (
                          <span className="ml-1 text-xs font-normal">
                            (+{formatearAtraso(minutosAtraso(camion.horaSalidaPlanificada))})
                          </span>
                        )}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge color={TRUCK_STATE_COLOR[camion.estado as TruckState] || "neutral"}>
                      {etiquetasEstado[camion.estado] || camion.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ChevronRight size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </TableCell>
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Paginación */}
      {!cargando && meta.totalPaginas > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="font-display text-xs text-text-muted">
            {((pagina - 1) * meta.porPagina) + 1}–{Math.min(pagina * meta.porPagina, meta.total)} de {meta.total} camiones
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="p-1.5 rounded hover:bg-bg-elevated transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={15} className="text-text-muted" />
            </button>
            {Array.from({ length: meta.totalPaginas }, (_, i) => i + 1)
              .filter(p => p === 1 || p === meta.totalPaginas || Math.abs(p - pagina) <= 1)
              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 text-text-muted font-display text-xs">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPagina(p as number)}
                  className={`w-7 h-7 rounded font-display text-xs transition-colors cursor-pointer ${
                    pagina === p ? "bg-accent text-white" : "hover:bg-bg-elevated text-text-muted"
                  }`}
                >
                  {p}
                </button>
              ))
            }
            <button
              onClick={() => setPagina(p => Math.min(meta.totalPaginas, p + 1))}
              disabled={pagina === meta.totalPaginas}
              className="p-1.5 rounded hover:bg-bg-elevated transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={15} className="text-text-muted" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
