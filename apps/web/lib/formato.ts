/** Formatea una fecha ISO a HH:MM en locale chileno */
export function formatearHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

/** Formatea una fecha ISO a DD/MM HH:MM */
export function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Retorna los minutos de atraso respecto a una hora ISO (positivo = atrasado) */
export function minutosAtraso(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

/** Formatea minutos en "Xh Ym" o "Ym" */
export function formatearAtraso(minutos: number): string {
  if (minutos < 60) return `${minutos}m`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
