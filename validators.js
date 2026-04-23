// Validación de datos para importación segura

/**
 * Verifica si un objeto tiene la estructura mínima de un expediente.
 */
export function esExpedienteValido(obj) {
  if (!obj || typeof obj !== 'object') return false;
  // Campos obligatorios
  if (typeof obj.id !== 'number' && typeof obj.id !== 'string') return false;
  if (typeof obj.cliente !== 'string' || obj.cliente.trim() === '') return false;
  // Fecha debe ser válida si existe
  if (obj.fechaVence && isNaN(Date.parse(obj.fechaVence))) return false;
  return true;
}

/**
 * Valida y limpia un array de expedientes importados.
 * Retorna un objeto { validos: [], invalidos: number }
 */
export function sanitizarImportacion(datos) {
  if (!Array.isArray(datos)) return { validos: [], invalidos: 0 };
  const validos = datos.filter(obj => esExpedienteValido(obj));
  return { validos, invalidos: datos.length - validos.length };
}