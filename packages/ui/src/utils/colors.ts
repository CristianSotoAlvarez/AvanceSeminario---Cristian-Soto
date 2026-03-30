/**
 * Convierte un hex a rgba con opacidad.
 * Usado para generar fondos y bordes de badges dinámicamente.
 */
export function hexToRgba(hex: string, opacity: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

/** Colores semánticos del design system — Analytics Amber (tema claro) */
export const semanticColors = {
  success: "#16A34A",
  error: "#DC2626",
  warning: "#D97706",
  info: "#2563EB",
  active: "#F59E0B",
  neutral: "#64748B",
} as const;

/** Re-export del tipo centralizado en @dispatch-track/types */
export type SemanticColorKey = import("@dispatch-track/types").SemanticColor;

/**
 * Genera estilos de badge para un color semántico.
 * Background al 12%, borde al 25%, texto al 100%.
 */
export function getBadgeStyles(color: SemanticColorKey) {
  const hex = semanticColors[color];
  return {
    backgroundColor: hexToRgba(hex, 0.12),
    borderColor: hexToRgba(hex, 0.25),
    color: hex,
  };
}
