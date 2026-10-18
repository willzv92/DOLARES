/**
 * Fuente única de verdad para el formato de fecha/hora.
 *
 * Antes cada registro guardaba `new Date().toLocaleString()` (sin locale ni
 * opciones) como string en Firestore, así que el formato lo decidía el
 * navegador/PC que lo creó: 202 registros quedaron con 28 variantes distintas
 * (12 h / 24 h, "p.m." / "p. m.", "9/9/2026" / "09/9/2026").
 *
 * Ahora solo se guarda el instante (`timestamp`) y se formatea al mostrar,
 * uniendo las partes a mano para que el resultado sea idéntico en Chrome,
 * Firefox y Brave.
 */

const LOCALE = "es-VE";

export const LOCALE_FECHAS = LOCALE;

// hourCycle "h23" (y no solo hour12: false) evita el "24:00:00" de la medianoche.
const fmtHora = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const fmtSoloFecha = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function partesAObjeto(parts) {
  const obj = {};
  for (const { type, value } of parts) obj[type] = value;
  return obj;
}

/**
 * Convierte un epoch ms en "18/10/2026".
 * Devuelve null si no hay fecha válida.
 */
export function formatearSoloFecha(ms) {
  if (!ms) return null;
  const fecha = new Date(ms);
  if (Number.isNaN(fecha.getTime())) return null;
  const p = partesAObjeto(fmtSoloFecha.formatToParts(fecha));
  return `${p.day}/${p.month}/${p.year}`;
}

/**
 * Convierte un epoch ms en "18/10/2026, 14:30:00".
 * Devuelve null si no hay fecha válida.
 */
export function formatearFechaHora(ms) {
  if (!ms) return null;
  const fecha = new Date(ms);
  if (Number.isNaN(fecha.getTime())) return null;
  const p = partesAObjeto(fmtHora.formatToParts(fecha));
  return `${p.day}/${p.month}/${p.year}, ${p.hour}:${p.minute}:${p.second}`;
}

/**
 * Fecha legible para tabla y PDF.
 * Prioridad: timestamp → campo heredado `fecha` → guion.
 */
export function fechaLegible(reg) {
  if (!reg) return "—";
  return formatearFechaHora(reg.timestamp) || reg.fecha || "—";
}
