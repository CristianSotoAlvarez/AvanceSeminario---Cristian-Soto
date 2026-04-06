"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Upload, Package, Search, Pencil, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  listarProductosApi, crearProductoApi, actualizarProductoApi,
  importarProductosCsvApi, type Producto,
} from "@/lib/api";

// ─── Modal crear/editar ───────────────────────────────────────────────────────

function ModalProducto({
  producto,
  onGuardar,
  onCerrar,
}: {
  producto?: Producto;
  onGuardar: (p: Producto) => void;
  onCerrar: () => void;
}) {
  const [sku, setSku]           = useState(producto?.sku ?? "");
  const [nombre, setNombre]     = useState(producto?.nombre ?? "");
  const [unidad, setUnidad]     = useState(producto?.unidadMedida ?? "caja");
  const [peso, setPeso]         = useState(producto?.pesoKgUnitario?.toString() ?? "");
  const [enviando, setEnviando] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!sku.trim() || !nombre.trim()) { setError("SKU y nombre son obligatorios"); return; }
    setError(null);
    setEnviando(true);
    try {
      const datos = { sku: sku.trim(), nombre: nombre.trim(), unidadMedida: unidad.trim() || "caja", pesoKgUnitario: peso ? parseFloat(peso) : undefined };
      const resultado = producto
        ? await actualizarProductoApi(producto.id, datos)
        : await crearProductoApi(datos);
      onGuardar(resultado);
    } catch (e: any) {
      setError(e.message || "Error al guardar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <motion.div className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="bg-bg-surface rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ border: "1px solid rgba(30,58,95,0.15)" }}
        initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }} transition={{ duration: 0.18 }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: "#1E3A5F" }}>
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-white">
            {producto ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          <button onClick={onCerrar} className="text-white/50 hover:text-white transition-colors cursor-pointer"><X size={18} /></button>
        </div>
        <form onSubmit={guardar} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-display text-[10px] uppercase tracking-widest text-text-muted">SKU *</label>
              <input
                value={sku} onChange={e => setSku(e.target.value)} disabled={!!producto}
                placeholder="EJ: AVE-001"
                className="h-9 px-3 rounded-lg border border-bg-elevated bg-bg-surface font-data text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-display text-[10px] uppercase tracking-widest text-text-muted">Unidad</label>
              <input
                value={unidad} onChange={e => setUnidad(e.target.value)} placeholder="caja, kg, unidad..."
                className="h-9 px-3 rounded-lg border border-bg-elevated bg-bg-surface font-display text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-display text-[10px] uppercase tracking-widest text-text-muted">Nombre *</label>
            <input
              value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Pollo entero congelado"
              className="h-9 px-3 rounded-lg border border-bg-elevated bg-bg-surface font-display text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-display text-[10px] uppercase tracking-widest text-text-muted">Peso unitario (kg)</label>
            <input
              type="number" step="0.01" min="0" value={peso} onChange={e => setPeso(e.target.value)} placeholder="Opcional"
              className="h-9 px-3 rounded-lg border border-bg-elevated bg-bg-surface font-data text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCerrar} className="flex-1 h-9 rounded-lg border border-bg-elevated font-display text-sm text-text-muted hover:text-text-primary transition-colors cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={enviando}
              className="flex-1 h-9 rounded-lg font-display text-sm text-white font-semibold transition-colors cursor-pointer disabled:opacity-50"
              style={{ background: "#1E3A5F" }}>
              {enviando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ProductosPage() {
  const [productos, setProductos]     = useState<Producto[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [busqueda, setBusqueda]       = useState("");
  const [modalAbierto, setModal]      = useState(false);
  const [editando, setEditando]       = useState<Producto | null>(null);
  const [importando, setImportando]   = useState(false);
  const [resultadoCsv, setResultadoCsv] = useState<{ creados: number; actualizados: number; errores: string[] } | null>(null);
  const inputCsvRef = useRef<HTMLInputElement>(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    try { setProductos(await listarProductosApi()); }
    catch { toast.error("Error al cargar productos"); }
    finally { setCargando(false); }
  }

  function onGuardar(p: Producto) {
    setProductos(prev => {
      const idx = prev.findIndex(x => x.id === p.id);
      return idx >= 0 ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev];
    });
    setModal(false);
    setEditando(null);
    toast.success(editando ? "Producto actualizado" : "Producto creado");
  }

  async function toggleActivo(p: Producto) {
    try {
      const actualizado = await actualizarProductoApi(p.id, { activo: !p.activo });
      setProductos(prev => prev.map(x => x.id === p.id ? actualizado : x));
    } catch { toast.error("Error al actualizar"); }
  }

  async function manejarCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setImportando(true);
    setResultadoCsv(null);
    try {
      const texto = await archivo.text();
      const lineas = texto.split("\n").map(l => l.trim()).filter(Boolean);
      if (lineas.length < 2) { toast.error("CSV vacío o inválido"); return; }
      const cabeceras = lineas[0].split(/[,;]/).map(h => h.trim().toLowerCase().replace(/"/g, ""));
      const filas = lineas.slice(1).map(linea => {
        const vals = linea.split(/[,;]/).map(v => v.trim().replace(/"/g, ""));
        const obj: any = {};
        cabeceras.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
        return obj;
      });
      const resultado = await importarProductosCsvApi(filas);
      setResultadoCsv(resultado);
      toast.success(`Importado: ${resultado.creados} creados, ${resultado.actualizados} actualizados`);
      await cargar();
    } catch (err: any) {
      toast.error(err.message || "Error al importar");
    } finally {
      setImportando(false);
      if (inputCsvRef.current) inputCsvRef.current.value = "";
    }
  }

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.sku.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-lg font-bold text-text-primary">Catálogo de Productos</h1>
          <p className="font-display text-xs text-text-muted mt-0.5">{productos.length} productos registrados</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" accept=".csv" ref={inputCsvRef} onChange={manejarCsv} className="hidden" />
          <button
            onClick={() => inputCsvRef.current?.click()} disabled={importando}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-bg-elevated font-display text-xs text-text-muted hover:text-text-primary hover:border-accent transition-colors cursor-pointer disabled:opacity-50"
          >
            <Upload size={13} />
            {importando ? "Importando..." : "Importar CSV"}
          </button>
          <button
            onClick={() => { setEditando(null); setModal(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-display text-xs text-white font-semibold cursor-pointer"
            style={{ background: "#1E3A5F" }}
          >
            <Plus size={13} />
            Nuevo producto
          </button>
        </div>
      </div>

      {/* Resultado CSV */}
      <AnimatePresence>
        {resultadoCsv && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-lg border p-3 flex items-start gap-3"
            style={{ background: resultadoCsv.errores.length ? "#FFF7ED" : "#F0FDF4", borderColor: resultadoCsv.errores.length ? "#FED7AA" : "#BBF7D0" }}>
            {resultadoCsv.errores.length ? <AlertTriangle size={14} className="text-orange-500 mt-0.5 shrink-0" /> : <Check size={14} className="text-green-600 mt-0.5 shrink-0" />}
            <div className="flex-1">
              <p className="font-display text-xs font-semibold" style={{ color: resultadoCsv.errores.length ? "#C2410C" : "#16A34A" }}>
                {resultadoCsv.creados} creados · {resultadoCsv.actualizados} actualizados
                {resultadoCsv.errores.length > 0 && ` · ${resultadoCsv.errores.length} errores`}
              </p>
              {resultadoCsv.errores.map((e, i) => (
                <p key={i} className="font-display text-[10px] text-orange-600 mt-0.5">{e}</p>
              ))}
            </div>
            <button onClick={() => setResultadoCsv(null)} className="text-text-muted hover:text-text-primary cursor-pointer"><X size={13} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formato CSV */}
      <div className="rounded-lg border border-dashed border-bg-elevated p-3 bg-bg-elevated/30">
        <p className="font-display text-[10px] uppercase tracking-widest text-text-muted mb-1">Formato CSV esperado</p>
        <code className="font-data text-[11px] text-text-muted">sku,nombre,unidadMedida,pesoKgUnitario</code>
        <br />
        <code className="font-data text-[11px] text-accent">AVE-001,Pollo entero congelado,caja,18.5</code>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o SKU..."
          className="w-full h-9 pl-8 pr-3 rounded-lg border border-bg-elevated bg-bg-surface font-display text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* Tabla */}
      <div className="bg-bg-surface border border-bg-elevated rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-bg-elevated/60">
            <tr>
              {["SKU", "Nombre", "Unidad", "Peso/u.", "Estado", ""].map(h => (
                <th key={h} className="py-2.5 px-4 font-display text-[10px] font-semibold text-text-muted uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-elevated">
            {cargando ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="py-3 px-4"><div className="h-4 bg-bg-elevated rounded animate-pulse" /></td></tr>
              ))
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center font-display text-sm text-text-muted">
                {busqueda ? "Sin resultados" : "No hay productos. Importa un CSV o crea uno manualmente."}
              </td></tr>
            ) : filtrados.map(p => (
              <tr key={p.id} className="hover:bg-bg-elevated/30 transition-colors group">
                <td className="py-3 px-4 font-data text-xs font-bold text-accent tracking-widest">{p.sku}</td>
                <td className="py-3 px-4 font-display text-sm text-text-primary">{p.nombre}</td>
                <td className="py-3 px-4 font-display text-xs text-text-muted">{p.unidadMedida}</td>
                <td className="py-3 px-4 font-data text-xs text-text-muted">{p.pesoKgUnitario ? `${p.pesoKgUnitario} kg` : "—"}</td>
                <td className="py-3 px-4">
                  <span className={`font-display text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${p.activo ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <button onClick={() => { setEditando(p); setModal(true); }} className="p-1.5 rounded hover:bg-bg-elevated transition-colors cursor-pointer" title="Editar">
                      <Pencil size={12} className="text-text-muted" />
                    </button>
                    <button onClick={() => toggleActivo(p)} className="p-1.5 rounded hover:bg-bg-elevated transition-colors cursor-pointer" title={p.activo ? "Desactivar" : "Activar"}>
                      {p.activo ? <X size={12} className="text-red-400" /> : <Check size={12} className="text-green-500" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {(modalAbierto || editando) && (
          <ModalProducto
            producto={editando ?? undefined}
            onGuardar={onGuardar}
            onCerrar={() => { setModal(false); setEditando(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
