"use client";

import { useContext, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Settings, Users, Plus, Pencil, Trash2,
  X, Loader2, ShieldCheck, Eye, EyeOff, UserCheck,
} from "lucide-react";
import { AuthContext } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  listarUsuariosApi, crearUsuarioApi, actualizarUsuarioApi, desactivarUsuarioApi,
  type UsuarioAdmin,
} from "@/lib/api";

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROLES: { value: string; label: string }[] = [
  { value: "JEFE_DESPACHO",          label: "Jefe de Despacho" },
  { value: "COORDINADOR_TRANSPORTE", label: "Coordinador Transporte" },
  { value: "COORDINADOR",            label: "Coordinador" },
  { value: "SUPERVISOR",             label: "Supervisor" },
  { value: "PICKINERO",              label: "Pickinero" },
  { value: "CARGADOR",               label: "Cargador" },
  { value: "OPERADOR_TUNEL",         label: "Operador Túnel" },
  { value: "SAG",                    label: "Inspector SAG" },
];

const COLOR_ROL: Record<string, { bg: string; color: string }> = {
  JEFE_DESPACHO:          { bg: "#EFF6FF", color: "#1E3A5F" },
  COORDINADOR_TRANSPORTE: { bg: "#F0FDF4", color: "#15803D" },
  COORDINADOR:            { bg: "#F0FDF4", color: "#15803D" },
  SUPERVISOR:             { bg: "#FFF7ED", color: "#C2410C" },
  PICKINERO:              { bg: "#FAF5FF", color: "#7C3AED" },
  CARGADOR:               { bg: "#FFF1F2", color: "#BE123C" },
  OPERADOR_TUNEL:         { bg: "#ECFEFF", color: "#0E7490" },
  SAG:                    { bg: "#FEF9C3", color: "#854D0E" },
};

const ROLES_NECESITAN_EDIFICIO = ["PICKINERO", "CARGADOR", "OPERADOR_TUNEL", "SUPERVISOR"];

const EDIFICIOS_OPCIONES = [
  { value: "", label: "Sin edificio" },
  { value: "AVES",        label: "Planta Aves" },
  { value: "CERDO",       label: "Planta Cerdo" },
  { value: "FRIGORIFICO", label: "Frigorífico" },
];

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface FormUsuario {
  nombre: string;
  rut: string;
  email: string;
  password: string;
  rol: string;
  edificioTipo: string;
}

const FORM_VACIO: FormUsuario = { nombre: "", rut: "", email: "", password: "", rol: "CARGADOR", edificioTipo: "" };

// ─── Badge de rol ─────────────────────────────────────────────────────────────

function BadgeRol({ rol }: { rol: string }) {
  const cfg = COLOR_ROL[rol] ?? { bg: "#F8FAFC", color: "#94A3B8" };
  const label = ROLES.find(r => r.value === rol)?.label ?? rol;
  return (
    <span
      className="font-display text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {label}
    </span>
  );
}

// ─── Modal crear / editar usuario ─────────────────────────────────────────────

function ModalUsuario({
  usuario,
  onCerrar,
  onGuardado,
}: {
  usuario: UsuarioAdmin | null; // null = crear, objeto = editar
  onCerrar: () => void;
  onGuardado: (u: UsuarioAdmin) => void;
}) {
  const esEdicion = !!usuario;
  const [form, setForm] = useState<FormUsuario>(
    usuario
      ? { nombre: usuario.nombre, rut: usuario.rut, email: usuario.email, password: "", rol: usuario.rol, edificioTipo: usuario.edificio?.tipo ?? "" }
      : FORM_VACIO
  );
  const [mostrarPass, setMostrarPass] = useState(false);
  const [guardando, setGuardando] = useState(false);

  function set(campo: keyof FormUsuario, valor: string) {
    setForm(f => ({ ...f, [campo]: valor }));
  }

  async function guardar() {
    if (!form.nombre || !form.rut || !form.email || (!esEdicion && !form.password) || !form.rol) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    setGuardando(true);
    try {
      let resultado: UsuarioAdmin;
      if (esEdicion) {
        const datos: any = { nombre: form.nombre, email: form.email, rol: form.rol };
        if (form.password) datos.password = form.password;
        // edificioId se resuelve en backend por tipo — enviamos null si no aplica
        resultado = await actualizarUsuarioApi(usuario!.id, datos);
      } else {
        resultado = await crearUsuarioApi({
          nombre: form.nombre,
          rut: form.rut,
          email: form.email,
          password: form.password,
          rol: form.rol,
        });
      }
      toast.success(esEdicion ? "Usuario actualizado" : "Usuario creado");
      onGuardado(resultado);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  const necesitaEdificio = ROLES_NECESITAN_EDIFICIO.includes(form.rol);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCerrar} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="relative bg-bg-surface rounded-xl shadow-2xl w-full max-w-md border border-bg-elevated overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-elevated">
          <h2 className="font-display text-sm font-semibold text-text-primary flex items-center gap-2">
            <UserCheck size={15} className="text-accent" />
            {esEdicion ? `Editar — ${usuario!.nombre}` : "Nuevo usuario"}
          </h2>
          <button onClick={onCerrar} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Nombre */}
          <div>
            <label className="font-display text-[10px] uppercase text-text-muted tracking-widest block mb-1">Nombre completo *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => set("nombre", e.target.value)}
              className="w-full bg-bg-surface border border-bg-elevated rounded-lg px-3 py-2 font-display text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Ej: Juan Pérez"
            />
          </div>

          {/* RUT — solo en creación */}
          {!esEdicion && (
            <div>
              <label className="font-display text-[10px] uppercase text-text-muted tracking-widest block mb-1">RUT *</label>
              <input
                type="text"
                value={form.rut}
                onChange={e => set("rut", e.target.value)}
                className="w-full bg-bg-surface border border-bg-elevated rounded-lg px-3 py-2 font-display text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="12.345.678-9"
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="font-display text-[10px] uppercase text-text-muted tracking-widest block mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set("email", e.target.value)}
              className="w-full bg-bg-surface border border-bg-elevated rounded-lg px-3 py-2 font-display text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="juan@empresa.cl"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="font-display text-[10px] uppercase text-text-muted tracking-widest block mb-1">
              {esEdicion ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña *"}
            </label>
            <div className="relative">
              <input
                type={mostrarPass ? "text" : "password"}
                value={form.password}
                onChange={e => set("password", e.target.value)}
                className="w-full bg-bg-surface border border-bg-elevated rounded-lg px-3 py-2 pr-10 font-display text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder={esEdicion ? "••••••••" : "Mínimo 6 caracteres"}
              />
              <button
                type="button"
                onClick={() => setMostrarPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                {mostrarPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Rol */}
          <div>
            <label className="font-display text-[10px] uppercase text-text-muted tracking-widest block mb-1">Rol *</label>
            <select
              value={form.rol}
              onChange={e => set("rol", e.target.value)}
              className="w-full bg-bg-surface border border-bg-elevated rounded-lg px-3 py-2 font-display text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Preview del badge */}
          <div className="flex items-center gap-2">
            <span className="font-display text-[10px] text-text-muted">Vista previa:</span>
            <BadgeRol rol={form.rol} />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-bg-elevated">
          <button
            onClick={onCerrar}
            className="flex-1 px-4 py-2 rounded-lg border border-bg-elevated font-display text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex-1 px-4 py-2 rounded-lg font-display text-sm text-white disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 transition-colors"
            style={{ background: "#EA580C" }}
          >
            {guardando && <Loader2 size={13} className="animate-spin" />}
            {guardando ? "Guardando..." : (esEdicion ? "Guardar cambios" : "Crear usuario")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Matriz de permisos ───────────────────────────────────────────────────────

const MATRIZ_ROLES = [
  { accion: "Crear camiones",             roles: ["COORDINADOR_TRANSPORTE"] },
  { accion: "Asignar andenes",            roles: ["JEFE_DESPACHO", "SUPERVISOR", "COORDINADOR"] },
  { accion: "Reordenar paradas",          roles: ["JEFE_DESPACHO", "SUPERVISOR", "COORDINADOR"] },
  { accion: "Iniciar / finalizar carga",  roles: ["JEFE_DESPACHO", "SUPERVISOR", "CARGADOR"] },
  { accion: "Crear y armar pallets",      roles: ["JEFE_DESPACHO", "SUPERVISOR", "PICKINERO", "CARGADOR"] },
  { accion: "Cargar pallets",             roles: ["JEFE_DESPACHO", "SUPERVISOR", "PICKINERO", "CARGADOR"] },
  { accion: "Verificar pallets",          roles: ["JEFE_DESPACHO", "SUPERVISOR", "COORDINADOR"] },
  { accion: "Justificar atrasos",         roles: ["JEFE_DESPACHO", "SUPERVISOR", "COORDINADOR"] },
  { accion: "Validar temperatura túnel",  roles: ["JEFE_DESPACHO", "SUPERVISOR", "OPERADOR_TUNEL"] },
  { accion: "Inspección SAG",             roles: ["SAG"] },
  { accion: "Marcar listo / despachar",   roles: ["JEFE_DESPACHO", "SUPERVISOR", "COORDINADOR"] },
  { accion: "Ver reportes",               roles: ["JEFE_DESPACHO", "SUPERVISOR", "COORDINADOR"] },
  { accion: "Configuración del sistema",  roles: ["JEFE_DESPACHO"] },
];

const TODOS_ROLES_MATRIZ = ["JEFE_DESPACHO", "COORDINADOR_TRANSPORTE", "COORDINADOR", "SUPERVISOR", "PICKINERO", "CARGADOR", "OPERADOR_TUNEL", "SAG"];

function Dot({ activo }: { activo: boolean }) {
  return (
    <div className="flex items-center justify-center">
      <div className="w-4 h-4 rounded-full" style={{ background: activo ? "#16A34A" : "#E2E8F0" }} />
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Tab = "usuarios" | "permisos";

export default function ConfiguracionPage() {
  const { usuario } = useContext(AuthContext);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("usuarios");
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [modalUsuario, setModalUsuario] = useState<UsuarioAdmin | null | "nuevo">(null);
  const [eliminando, setEliminando] = useState<string | null>(null);

  useEffect(() => {
    if (usuario && usuario.rol !== "JEFE_DESPACHO") {
      router.replace("/dashboard");
    }
  }, [usuario, router]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setUsuarios(await listarUsuariosApi());
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (!usuario || usuario.rol !== "JEFE_DESPACHO") return null;

  const usuariosFiltrados = usuarios.filter(u => {
    const matchBusqueda = !busqueda ||
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.rut.includes(busqueda) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase());
    const matchRol = !filtroRol || u.rol === filtroRol;
    return matchBusqueda && matchRol;
  });

  async function confirmarEliminar(u: UsuarioAdmin) {
    if (!confirm(`¿Desactivar la cuenta de ${u.nombre}? El usuario no podrá iniciar sesión.`)) return;
    setEliminando(u.id);
    try {
      await desactivarUsuarioApi(u.id);
      toast.success(`Cuenta de ${u.nombre} desactivada`);
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, activo: false } : x));
    } catch (e: any) {
      toast.error(e.message || "Error al desactivar");
    } finally {
      setEliminando(null);
    }
  }

  function onGuardado(u: UsuarioAdmin) {
    setUsuarios(prev => {
      const existe = prev.find(x => x.id === u.id);
      return existe ? prev.map(x => x.id === u.id ? u : x) : [u, ...prev];
    });
    setModalUsuario(null);
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "usuarios", label: "Trabajadores", icon: Users },
    { id: "permisos", label: "Permisos",     icon: ShieldCheck },
  ];

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
            <Settings size={18} className="text-accent" />
          </div>
          <h1 className="font-display text-xl font-semibold text-text-primary">Configuración</h1>
        </div>
        <p className="font-display text-sm text-text-muted">Administración del sistema — acceso exclusivo Jefe de Despacho</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-elevated/50 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-display text-xs transition-all cursor-pointer"
            style={tab === t.id
              ? { background: "var(--color-bg-surface)", color: "var(--color-accent)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
              : { color: "var(--color-text-muted)" }
            }
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: TRABAJADORES ── */}
      {tab === "usuarios" && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">

          {/* Barra superior */}
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Buscar por nombre, RUT o email..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="flex-1 min-w-[200px] bg-bg-surface border border-bg-elevated rounded-lg px-3 py-2 font-display text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-muted/50"
            />
            <select
              value={filtroRol}
              onChange={e => setFiltroRol(e.target.value)}
              className="bg-bg-surface border border-bg-elevated rounded-lg px-3 py-2 font-display text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
            >
              <option value="">Todos los roles</option>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button
              onClick={() => setModalUsuario("nuevo")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-display text-sm text-white cursor-pointer transition-colors"
              style={{ background: "#EA580C" }}
            >
              <Plus size={14} /> Nuevo usuario
            </button>
          </div>

          {/* Tabla */}
          <div className="bg-bg-surface border border-bg-elevated rounded-xl overflow-hidden">
            {/* Header tabla */}
            <div className="grid grid-cols-[2fr_1.2fr_2fr_1.4fr_1fr_90px] gap-3 px-5 py-2.5 border-b border-bg-elevated items-center">
              {["Nombre", "RUT", "Email", "Rol", "Estado", ""].map(h => (
                <span key={h} className="font-display text-[10px] uppercase text-text-muted tracking-widest">{h}</span>
              ))}
            </div>

            {cargando ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-text-muted" />
              </div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Users size={28} className="text-text-muted opacity-30" />
                <p className="font-display text-sm text-text-muted">Sin resultados</p>
              </div>
            ) : (
              <div className="divide-y divide-bg-elevated/50">
                {usuariosFiltrados.map((u, i) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="grid grid-cols-[2fr_1.2fr_2fr_1.4fr_1fr_90px] gap-3 px-5 py-3 items-center"
                    style={{ opacity: u.activo ? 1 : 0.45 }}
                  >
                    <span className="font-display text-sm text-text-primary truncate">{u.nombre}</span>
                    <span className="font-data text-xs text-text-muted">{u.rut}</span>
                    <span className="font-display text-xs text-text-muted truncate">{u.email}</span>
                    <BadgeRol rol={u.rol} />
                    <span
                      className="font-display text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full w-fit"
                      style={u.activo
                        ? { background: "#F0FDF4", color: "#16A34A" }
                        : { background: "#FFF1F2", color: "#DC2626" }
                      }
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setModalUsuario(u)}
                        className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      {u.activo && u.id !== usuario.id && (
                        <button
                          onClick={() => confirmarEliminar(u)}
                          disabled={eliminando === u.id}
                          className="p-1.5 rounded-md text-text-muted hover:text-semantic-error hover:bg-semantic-error/10 transition-colors cursor-pointer disabled:opacity-40"
                          title="Desactivar cuenta"
                        >
                          {eliminando === u.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="px-5 py-3 border-t border-bg-elevated flex items-center justify-between">
              <span className="font-display text-xs text-text-muted">
                {usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? "s" : ""}
                {filtroRol || busqueda ? ` (filtrado de ${usuarios.length})` : ""}
              </span>
              <span className="font-display text-xs text-text-muted">
                {usuarios.filter(u => u.activo).length} activos · {usuarios.filter(u => !u.activo).length} inactivos
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB: PERMISOS ── */}
      {tab === "permisos" && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div className="bg-bg-surface border border-bg-elevated rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-bg-elevated">
              <ShieldCheck size={14} className="text-accent" />
              <h2 className="font-display text-[11px] uppercase text-text-muted tracking-widest">Matriz de permisos por rol</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-bg-elevated">
                    <th className="font-display text-[10px] uppercase text-text-muted tracking-widest text-left px-5 py-3 w-52">Acción</th>
                    {TODOS_ROLES_MATRIZ.map(rol => (
                      <th key={rol} className="font-display text-[10px] uppercase text-text-muted tracking-widest text-center px-3 py-3 min-w-[90px]">
                        {ROLES.find(r => r.value === rol)?.label ?? rol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIZ_ROLES.map((fila, i) => (
                    <tr key={fila.accion} className="border-b border-bg-elevated/50 last:border-0" style={{ background: i % 2 === 0 ? "transparent" : "#F8FAFC08" }}>
                      <td className="font-display text-xs text-text-primary px-5 py-3">{fila.accion}</td>
                      {TODOS_ROLES_MATRIZ.map(rol => (
                        <td key={rol} className="px-3 py-3"><Dot activo={fila.roles.includes(rol)} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}


      {/* Modal */}
      <AnimatePresence>
        {modalUsuario !== null && (
          <ModalUsuario
            usuario={modalUsuario === "nuevo" ? null : modalUsuario}
            onCerrar={() => setModalUsuario(null)}
            onGuardado={onGuardado}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
