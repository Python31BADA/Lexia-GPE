// src/utils/helpers.js

/** Escapa HTML para prevenir XSS */
export function escapeHtml(str) {
  if (!str) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(str).replace(/[&<>"']/g, m => map[m]);
}

/** Devuelve una fecha en formato YYYY-MM-DD sumando días a hoy */
export function obtenerFechaSuma(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

/** Determina si un expediente está vencido */
export function estaVencido(exp) {
  if (!exp.fechaVence || exp.cerrado) return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return new Date(exp.fechaVence) < hoy;
}

/** Formatea fecha para mostrar en formato local: DD/MM/YYYY */
export function formatearFecha(fechaStr) {
  if (!fechaStr) return 'Sin fecha';
  const fecha = new Date(fechaStr);
  // Ajuste por zona horaria para evitar desfase de un día
  const offset = fecha.getTimezoneOffset();
  const fechaLocal = new Date(fecha.getTime() + offset * 60 * 1000);
  return fechaLocal.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Calcula días restantes hasta una fecha (devuelve número entero) */
export function diasRestantes(fechaStr) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vence = new Date(fechaStr);
  vence.setHours(0, 0, 0, 0);
  const diff = vence - hoy;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}