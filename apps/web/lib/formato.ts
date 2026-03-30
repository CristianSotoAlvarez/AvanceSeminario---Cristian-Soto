/** Formatea una fecha ISO a HH:MM en locale chileno */
export function formatearHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}
