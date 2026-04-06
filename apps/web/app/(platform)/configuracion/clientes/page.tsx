'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  listarClientesApi,
  crearClienteApi,
  actualizarClienteApi,
  eliminarClienteApi,
  Cliente,
} from '@/lib/api';

const esquemaCliente = z.object({
  nombre:      z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  tipoDestino: z.enum(['NACIONAL', 'EXPORTACION', 'INTERPLANTA']),
  rut:         z.string().optional(),
  codigo:      z.string().optional(),
  pais:        z.string().optional(),
}).refine(d => d.tipoDestino !== 'EXPORTACION' || !!d.pais?.trim(), {
  message: 'El país es requerido para clientes exportadores',
  path: ['pais'],
});

type FormCliente = z.infer<typeof esquemaCliente>;

const TIPOS = [
  { valor: 'NACIONAL',    label: 'Nacional',     color: 'bg-sky-100 text-sky-800' },
  { valor: 'EXPORTACION', label: 'Exportación',  color: 'bg-orange-100 text-orange-800' },
  { valor: 'INTERPLANTA', label: 'Interplanta',  color: 'bg-slate-100 text-slate-700' },
] as const;

function badgeTipo(tipo: string) {
  const t = TIPOS.find(t => t.valor === tipo);
  return t ? (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${t.color}`}>{t.label}</span>
  ) : null;
}

export default function ClientesPage() {
  const [clientes, setClientes]         = useState<Cliente[]>([]);
  const [cargando, setCargando]         = useState(true);
  const [filtroTipo, setFiltroTipo]     = useState('');
  const [filtroTexto, setFiltroTexto]   = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando]         = useState<Cliente | null>(null);
  const [errorServidor, setErrorServidor] = useState('');

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormCliente>({
    resolver: zodResolver(esquemaCliente),
    defaultValues: { tipoDestino: 'NACIONAL' },
  });
  const tipoDestino = watch('tipoDestino');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await listarClientesApi(filtroTipo || undefined);
      setClientes(datos);
    } finally {
      setCargando(false);
    }
  }, [filtroTipo]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirCrear = () => {
    setEditando(null);
    reset({ nombre: '', rut: '', codigo: '', tipoDestino: 'NACIONAL', pais: '' });
    setErrorServidor('');
    setModalAbierto(true);
  };

  const abrirEditar = (c: Cliente) => {
    setEditando(c);
    reset({
      nombre:      c.nombre,
      rut:         c.rut ?? '',
      codigo:      c.codigo ?? '',
      tipoDestino: c.tipoDestino as FormCliente['tipoDestino'],
      pais:        c.pais ?? '',
    });
    setErrorServidor('');
    setModalAbierto(true);
  };

  const cerrar = () => { setModalAbierto(false); setEditando(null); };

  const guardar = async (datos: FormCliente) => {
    setErrorServidor('');
    try {
      const payload = {
        nombre:      datos.nombre.trim(),
        rut:         datos.rut?.trim()    || undefined,
        codigo:      datos.codigo?.trim() || undefined,
        tipoDestino: datos.tipoDestino,
        pais:        datos.tipoDestino === 'EXPORTACION' ? (datos.pais?.trim() || undefined) : undefined,
      };
      if (editando) await actualizarClienteApi(editando.id, payload);
      else          await crearClienteApi(payload);
      cerrar();
      cargar();
    } catch (e: unknown) {
      setErrorServidor(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  const eliminar = async (c: Cliente) => {
    if (!confirm(`¿Desactivar a "${c.nombre}"?`)) return;
    await eliminarClienteApi(c.id);
    cargar();
  };

  const clientesFiltrados = clientes.filter(c =>
    !filtroTexto ||
    c.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
    (c.rut?.toLowerCase().includes(filtroTexto.toLowerCase())) ||
    (c.codigo?.toLowerCase().includes(filtroTexto.toLowerCase())) ||
    (c.pais?.toLowerCase().includes(filtroTexto.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Nacionales, interplanta y exportadores</p>
        </div>
        <button
          onClick={abrirCrear}
          className="px-4 py-2 rounded-lg bg-[#EA580C] text-white text-sm font-medium hover:bg-[#D04A08] transition-colors"
        >
          + Nuevo cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por nombre, RUT, código o país..."
          value={filtroTexto}
          onChange={e => setFiltroTexto(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30"
        />
        <div className="flex gap-2">
          {['', 'NACIONAL', 'EXPORTACION', 'INTERPLANTA'].map(t => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                filtroTipo === t
                  ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              {t === '' ? 'Todos' : t === 'NACIONAL' ? 'Nacional' : t === 'EXPORTACION' ? 'Exportación' : 'Interplanta'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {cargando ? (
          <div className="p-12 text-center text-slate-400 text-sm">Cargando...</div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No hay clientes registrados</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">ID</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">RUT</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">País</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Camiones</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientesFiltrados.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-[#1E3A5F]/5 text-[#1E3A5F] border border-[#1E3A5F]/10">
                      {c.codigo ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.nombre}</td>
                  <td className="px-4 py-3">{badgeTipo(c.tipoDestino)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.rut ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{c.pais ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{c._count?.camiones ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => abrirEditar(c)}
                        className="px-3 py-1 rounded text-xs font-medium border border-slate-200 text-slate-600 hover:border-[#1E3A5F] hover:text-[#1E3A5F] transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminar(c)}
                        className="px-3 py-1 rounded text-xs font-medium border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                      >
                        Desactivar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <h2 className="text-lg font-bold text-[#1E3A5F]">
              {editando ? 'Editar cliente' : 'Nuevo cliente'}
            </h2>

            <form onSubmit={handleSubmit(guardar)} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
                <input
                  {...register('nombre')}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${errors.nombre ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-[#EA580C]/30'}`}
                  placeholder="Nombre del cliente o empresa"
                />
                {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de destino *</label>
                <select
                  {...register('tipoDestino')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30 bg-white"
                >
                  {TIPOS.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
                </select>
              </div>

              {/* RUT — nacionales e interplanta */}
              {tipoDestino !== 'EXPORTACION' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">RUT</label>
                  <input
                    {...register('rut')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30"
                    placeholder="76.543.210-K"
                  />
                </div>
              )}

              {/* País — exportación */}
              {tipoDestino === 'EXPORTACION' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">País destino *</label>
                  <input
                    {...register('pais')}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${errors.pais ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-[#EA580C]/30'}`}
                    placeholder="China, Japón, Alemania..."
                  />
                  {errors.pais && <p className="text-xs text-red-500 mt-1">{errors.pais.message}</p>}
                </div>
              )}

              {/* Código interno */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Código interno <span className="text-slate-400 font-normal">(se genera automático si se deja vacío)</span>
                </label>
                <input
                  {...register('codigo')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30"
                  placeholder="CLI-N001"
                />
              </div>

              {errorServidor && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorServidor}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={cerrar}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#EA580C] text-white text-sm font-medium hover:bg-[#D04A08] transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
