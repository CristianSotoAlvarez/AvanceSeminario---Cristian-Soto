'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, X } from 'lucide-react';
import { generarQrCamionApi } from '@/lib/api';

interface Props {
  camionId: string;
  numeroTransporte: string;
}

export function QrCamion({ camionId, numeroTransporte }: Props) {
  const [abierto, setAbierto]   = useState(false);
  const [dataUrl, setDataUrl]   = useState('');
  const [cargando, setCargando] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!abierto) return;
    setCargando(true);

    generarQrCamionApi(camionId)
      .then(({ token }) => {
        const url = `${window.location.origin}/p/${token}`;
        return QRCode.toDataURL(url, {
          width: 280,
          margin: 2,
          color: { dark: '#1E3A5F', light: '#FFFFFF' },
          errorCorrectionLevel: 'M',
        });
      })
      .then(setDataUrl)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [abierto, camionId]);

  const descargar = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `QR-${numeroTransporte}.png`;
    a.click();
  };

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-[#1E3A5F] hover:text-[#1E3A5F] transition-colors text-xs font-medium"
        title="Ver código QR"
      >
        <QrCode size={14} />
        QR
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 flex flex-col items-center gap-4">
            <div className="flex w-full items-center justify-between">
              <p className="font-bold text-[#1E3A5F] text-sm">Código QR</p>
              <button onClick={() => setAbierto(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-mono">{numeroTransporte}</p>

            <div className="w-[200px] h-[200px] flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100">
              {cargando ? (
                <div className="text-xs text-slate-400">Generando...</div>
              ) : dataUrl ? (
                <img src={dataUrl} alt="QR" className="w-full h-full rounded-xl" />
              ) : (
                <div className="text-xs text-red-400">Error al generar QR</div>
              )}
            </div>

            <p className="text-[10px] text-slate-400 text-center">
              Escanea para acceder directamente al detalle del camión
            </p>

            <button
              onClick={descargar}
              disabled={!dataUrl}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E3A5F] text-white text-xs font-medium hover:bg-[#162d4a] disabled:opacity-40 transition-colors w-full justify-center"
            >
              <Download size={13} />
              Descargar PNG
            </button>
          </div>
        </div>
      )}
    </>
  );
}
