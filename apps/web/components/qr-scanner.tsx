'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScanLine, X, AlertTriangle, Loader2 } from 'lucide-react';
import { validarQrApi } from '@/lib/api';

interface Props {
  /** Texto del botón disparador */
  label?: string;
}

export function QrScanner({ label = 'Escanear QR' }: Props) {
  const router = useRouter();
  const [abierto, setAbierto]     = useState(false);
  const [error, setError]         = useState('');
  const [validando, setValidando] = useState(false);
  const escaner = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  const contenedorId = 'qr-scanner-container';

  /* ── Arrancar / detener cámara ────────────────────────────────────────── */

  useEffect(() => {
    if (!abierto) return;

    let activo = true;

    async function iniciar() {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!activo) return;

      const reader = new Html5Qrcode(contenedorId);
      escaner.current = reader;

      try {
        await reader.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (texto) => manejarLectura(texto),
          () => { /* ignora errores de frame */ },
        );
      } catch {
        if (activo) setError('No se pudo acceder a la cámara. Verifica los permisos.');
      }
    }

    iniciar();

    return () => {
      activo = false;
      escaner.current
        ?.stop()
        .catch(() => {})
        .finally(() => {
          escaner.current?.clear();
          escaner.current = null;
        });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  /* ── Procesar QR leído ────────────────────────────────────────────────── */

  async function manejarLectura(texto: string) {
    if (validando) return;

    // Extraer token del texto — acepta URL completa o token directo
    let token = texto.trim();
    try {
      const url = new URL(texto);
      const partes = url.pathname.split('/');
      token = partes[partes.length - 1] ?? texto;
    } catch {
      // no era una URL, usar el texto tal cual
    }

    if (!token) return;

    setValidando(true);

    // Detener cámara antes de navegar
    await escaner.current?.stop().catch(() => {});

    try {
      const { tipo, entidadId } = await validarQrApi(token);
      cerrar();
      if (tipo === 'camion')       router.push(`/camiones/${entidadId}`);
      else if (tipo === 'pallet')  router.push(`/pallets/${entidadId}`);
      else setError('Tipo de entidad desconocido en el QR.');
    } catch {
      setError('QR inválido o expirado. Genera uno nuevo desde el sistema.');
      setValidando(false);
    }
  }

  /* ── Cerrar modal ─────────────────────────────────────────────────────── */

  function cerrar() {
    setAbierto(false);
    setError('');
    setValidando(false);
  }

  /* ── Render ───────────────────────────────────────────────────────────── */

  return (
    <>
      <button
        onClick={() => { setError(''); setAbierto(true); }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#162d4a] active:scale-[0.97] transition-all shadow-sm"
      >
        <ScanLine size={16} />
        {label}
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
          {/* Cabecera */}
          <div className="w-full max-w-sm flex items-center justify-between mb-4">
            <p className="text-white font-medium text-sm">Apunta al código QR del camión</p>
            <button onClick={cerrar} className="text-white/60 hover:text-white transition-colors">
              <X size={22} />
            </button>
          </div>

          {/* Área de escaneo */}
          <div className="relative w-full max-w-sm">
            {/* Contenedor donde html5-qrcode inyecta el video */}
            <div
              id={contenedorId}
              className="rounded-2xl overflow-hidden bg-black"
              style={{ minHeight: '300px' }}
            />

            {/* Marco de mira */}
            {!validando && !error && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[240px] h-[240px] relative">
                  {/* Esquinas del marco */}
                  {[
                    'top-0 left-0 border-t-2 border-l-2 rounded-tl-lg',
                    'top-0 right-0 border-t-2 border-r-2 rounded-tr-lg',
                    'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg',
                    'bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg',
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-8 h-8 border-[#EA580C] ${cls}`} />
                  ))}
                  {/* Línea de escaneo animada */}
                  <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-[#EA580C]/70 animate-pulse" />
                </div>
              </div>
            )}

            {/* Estado: validando */}
            {validando && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-2xl gap-3">
                <Loader2 size={36} className="text-white animate-spin" />
                <p className="text-white text-sm font-medium">Validando QR...</p>
              </div>
            )}

            {/* Estado: error */}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-2xl gap-3 p-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-400" />
                </div>
                <p className="text-white text-sm text-center">{error}</p>
                <button
                  onClick={() => { setError(''); setValidando(false); }}
                  className="mt-1 px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
                >
                  Intentar de nuevo
                </button>
              </div>
            )}
          </div>

          <p className="text-white/40 text-xs mt-4 text-center max-w-xs">
            El QR debe haber sido generado desde DispatchTrack y estar vigente (válido por 24 horas).
          </p>
        </div>
      )}
    </>
  );
}
