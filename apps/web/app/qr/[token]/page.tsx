'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { validarQrApi } from '@/lib/api';
import { QrCode, AlertTriangle, Loader2 } from 'lucide-react';

export default function QrRedirectPage() {
  const { token } = useParams<{ token: string }>();
  const router    = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    validarQrApi(token)
      .then(({ tipo, entidadId }) => {
        if (tipo === 'camion')  router.replace(`/camiones/${entidadId}`);
        else if (tipo === 'pallet') router.replace(`/pallets/${entidadId}`);
        else setError('Tipo de entidad desconocido');
      })
      .catch(() => setError('QR inválido o expirado. Genera uno nuevo desde el sistema.'));
  }, [token, router]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 p-6">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <p className="font-bold text-slate-800 text-center">QR no válido</p>
        <p className="text-sm text-slate-500 text-center max-w-xs">{error}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 rounded-lg bg-[#1E3A5F] text-white text-sm font-medium"
        >
          Ir al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <QrCode size={48} className="text-[#1E3A5F]" />
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Validando QR...</span>
      </div>
    </div>
  );
}
