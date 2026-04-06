'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import { obtenerCamionApi, generarQrCamionApi, type CamionDetalle } from '@/lib/api';
import { etiquetasEstado, etiquetasTipo } from '@/lib/camion-config';

const CONFIG_EDIFICIO: Record<string, { label: string }> = {
  AVES:        { label: 'Aves' },
  CERDO:       { label: 'Cerdo' },
  FRIGORIFICO: { label: 'Frigorífico' },
};

const TIPO_BADGE: Record<string, string> = {
  NACIONAL:    'Nacional',
  EXPORTACION: 'Exportación',
  INTERPLANTA: 'Interplanta',
};

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ImprimirCamionPage() {
  const { id } = useParams<{ id: string }>();
  const [camion, setCamion] = useState<CamionDetalle | null>(null);
  const [qrUrl, setQrUrl]   = useState('');
  const [error, setError]   = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      obtenerCamionApi(id),
      generarQrCamionApi(id),
    ])
      .then(([c, { token }]) => {
        setCamion(c);
        const url = `${window.location.origin}/qr/${token}`;
        return QRCode.toDataURL(url, {
          width: 220,
          margin: 1,
          color: { dark: '#1E3A5F', light: '#FFFFFF' },
          errorCorrectionLevel: 'M',
        });
      })
      .then(setQrUrl)
      .catch(() => setError('No se pudo cargar la información del camión.'));
  }, [id]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500 text-sm">
        {error}
      </div>
    );
  }

  if (!camion || !qrUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-400 text-sm">
        Generando hoja de ruta...
      </div>
    );
  }

  const tipoCliente = camion.cliente?.tipoDestino;

  return (
    <>
      {/* Botones — solo visibles en pantalla, ocultos al imprimir */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg bg-[#1E3A5F] text-white text-sm font-medium shadow-lg hover:bg-[#162d4a] transition-colors"
        >
          Imprimir
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-medium shadow-lg hover:bg-slate-50 transition-colors"
        >
          Cerrar
        </button>
      </div>

      {/* Hoja de ruta — formato A4 */}
      <div
        style={{
          background: 'white',
          width: '210mm',
          minHeight: '297mm',
          padding: '16mm',
          margin: '0 auto',
          fontFamily: 'system-ui, sans-serif',
          boxSizing: 'border-box',
        }}
      >
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1E3A5F', paddingBottom: '10mm', marginBottom: '8mm' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <img src="/logo-icon.png" alt="JAT" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>Hoja de Ruta</p>
                <p style={{ fontSize: '9px', color: '#64748B', margin: 0 }}>Sistema DispatchTrack</p>
              </div>
            </div>

            <p style={{ fontSize: '36px', fontWeight: 900, color: '#1E3A5F', margin: '8px 0 2px', fontFamily: 'monospace', letterSpacing: '3px' }}>
              {camion.numeroTransporte ?? camion.patente}
            </p>
            {camion.patente && camion.numeroTransporte && (
              <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 8px' }}>Patente: {camion.patente}</p>
            )}

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#EFF6FF', color: '#1D4ED8', fontWeight: 600 }}>
                {etiquetasTipo[camion.tipo] ?? camion.tipo}
              </span>
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#F0FDF4', color: '#15803D', fontWeight: 600 }}>
                {etiquetasEstado[camion.estado] ?? camion.estado}
              </span>
              {tipoCliente && (
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#FFF7ED', color: '#C2410C', fontWeight: 600 }}>
                  {TIPO_BADGE[tipoCliente] ?? tipoCliente}
                </span>
              )}
            </div>
          </div>

          {/* QR */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <img src={qrUrl} alt="QR" style={{ width: '110px', height: '110px', display: 'block' }} />
            <p style={{ fontSize: '8px', color: '#94A3B8', marginTop: '4px', textAlign: 'center' }}>Escanear para acceder</p>
          </div>
        </div>

        {/* Cliente */}
        {camion.cliente && (
          <div style={{ marginBottom: '8mm', padding: '6mm', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <p style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 4px' }}>Cliente</p>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#1E3A5F', margin: '0 0 4px' }}>{camion.cliente.nombre}</p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {camion.cliente.codigo && (
                <span style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>{camion.cliente.codigo}</span>
              )}
              {camion.cliente.rut && (
                <span style={{ fontSize: '10px', color: '#64748B' }}>RUT: {camion.cliente.rut}</span>
              )}
              {camion.cliente.pais && (
                <span style={{ fontSize: '10px', color: '#64748B' }}>País destino: {camion.cliente.pais}</span>
              )}
            </div>
          </div>
        )}

        {/* Horarios */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', marginBottom: '8mm' }}>
          <div style={{ padding: '5mm', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <p style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 3px' }}>Llegada planificada</p>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#1E3A5F', margin: 0, fontFamily: 'monospace' }}>
              {formatearFecha(camion.horaLlegadaPlanificada)}
            </p>
          </div>
          {camion.horaSalidaPlanificada && (
            <div style={{ padding: '5mm', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              <p style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 3px' }}>Salida planificada</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#1E3A5F', margin: 0, fontFamily: 'monospace' }}>
                {formatearFecha(camion.horaSalidaPlanificada)}
              </p>
            </div>
          )}
        </div>

        {/* Paradas */}
        {camion.paradas && camion.paradas.length > 0 && (
          <div style={{ marginBottom: '8mm' }}>
            <p style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 4mm' }}>
              Ruta de expedición — {camion.paradas.length} parada{camion.paradas.length !== 1 ? 's' : ''}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#1E3A5F', color: 'white' }}>
                  <th style={{ padding: '5px 8px', textAlign: 'left', fontSize: '10px', fontWeight: 600 }}>#</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', fontSize: '10px', fontWeight: 600 }}>Planta / Edificio</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', fontSize: '10px', fontWeight: 600 }}>Pallets</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', fontSize: '10px', fontWeight: 600 }}>Estado</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', fontSize: '10px', fontWeight: 600 }}>Andén</th>
                </tr>
              </thead>
              <tbody>
                {camion.paradas.map((parada, i) => {
                  const cfg = CONFIG_EDIFICIO[parada.edificioTipo];
                  const palletsEnEntrega = parada.entrega?.pallets?.length ?? 0;
                  const solicitados = parada.cantidadPalletsSolicitados;
                  return (
                    <tr key={parada.id} style={{ background: i % 2 === 0 ? '#F8FAFC' : 'white', borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '6px 8px', color: '#64748B', fontFamily: 'monospace', fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ padding: '6px 8px', color: '#1E3A5F', fontWeight: 600 }}>{cfg?.label ?? parada.edificioTipo}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: '#1E3A5F', fontFamily: 'monospace' }}>
                        {solicitados ? `${palletsEnEntrega} / ${solicitados}` : palletsEnEntrega > 0 ? palletsEnEntrega : '—'}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <span style={{
                          fontSize: '9px', padding: '1px 6px', borderRadius: '4px', fontWeight: 600,
                          background: parada.estado === 'COMPLETADO' ? '#F0FDF4' : parada.estado === 'EN_PROCESO' ? '#EFF6FF' : '#F8FAFC',
                          color:      parada.estado === 'COMPLETADO' ? '#15803D' : parada.estado === 'EN_PROCESO' ? '#1D4ED8' : '#64748B',
                        }}>
                          {parada.estado === 'COMPLETADO' ? 'Completado' : parada.estado === 'EN_PROCESO' ? 'En proceso' : 'Pendiente'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', color: '#64748B', fontFamily: 'monospace', fontSize: '10px' }}>
                        {parada.anden?.codigo ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pie */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '5mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '8px', color: '#94A3B8', margin: 0 }}>
            Generado el {new Date().toLocaleString('es-CL')} · DispatchTrack
          </p>
          <p style={{ fontSize: '8px', color: '#94A3B8', margin: 0, fontFamily: 'monospace' }}>
            {camion.id}
          </p>
        </div>
      </div>
    </>
  );
}
