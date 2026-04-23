// src/ui/renderer.js
import { escapeHtml, estaVencido, formatearFecha } from '../utils/helpers.js';

export function renderizarLista(expedientesFiltrados, estadoUI, campos) {
  const { paginaActual, itemsPorPagina } = estadoUI;
  const totalResultados = expedientesFiltrados.length;
  const totalPaginas = Math.ceil(totalResultados / itemsPorPagina) || 1;
  const inicio = (paginaActual - 1) * itemsPorPagina;
  const paginados = expedientesFiltrados.slice(inicio, inicio + itemsPorPagina);

  if (totalResultados === 0) {
    return {
        html: `<div style="text-align: center; padding: 40px; color: var(--text-muted); font-style: normal;">No se encontraron expedientes con estos criterios</div>`,
        totalPaginas: 1
    };
}

  const html = paginados.map(exp => {
    const vencido = !exp.cerrado && estaVencido(exp);
    
    // Construir detalles de campos configurables
    let detallesHtml = '';
    campos.forEach(campo => {
      if (campo.enLista && campo.id !== 'fechaVence' && exp[campo.id]) {
        const valor = campo.type === 'select' ? exp[campo.id] : escapeHtml(exp[campo.id]);
        detallesHtml += `<div class="detalle-item"><span class="detalle-label">${campo.label}:</span> ${valor}</div>`;
      }
    });
    
    // Fecha de vencimiento siempre visible
    detallesHtml += `<div class="detalle-item"><span class="detalle-label">📅 Vence:</span> ${formatearFecha(exp.fechaVence)}</div>`;

    const notasPreview = exp.notas 
      ? `<div class="notas-preview">📌 ${escapeHtml(exp.notas.substring(0, 100))}${exp.notas.length > 100 ? '…' : ''}</div>` 
      : '';

    return `
      <div class="expediente-item ${vencido ? 'vencido' : ''}">
        <div class="expediente-header">
          <span class="cliente-nombre">${escapeHtml(exp.cliente)}</span>
          <span class="codigo-exp">${escapeHtml(exp.codigo || "S/C")}</span>
          ${exp.cerrado 
            ? '<span class="badge-cerrado">Cerrado</span>' 
            : (vencido ? '<span class="alert-badge">Vencido</span>' : '')}
        </div>
        <div class="detalles-grid">${detallesHtml}</div>
        ${notasPreview}
        <div class="acciones">
          <button class="btn-small btn-outline" data-id="${exp.id}" data-action="editar">✏️ Editar</button>
          ${!exp.cerrado 
            ? `<button class="btn-small btn-outline" data-id="${exp.id}" data-action="cerrar">🔒 Cerrar</button>`
            : `<button class="btn-small btn-outline" data-id="${exp.id}" data-action="reabrir">🔓 Reabrir</button>`
          }
          <button class="btn-small danger" data-id="${exp.id}" data-action="eliminar">🗑️ Eliminar</button>
        </div>
      </div>
    `;
  }).join('');

  return { html, totalPaginas };
}

export function actualizarPaginacionUI(totalResultados, paginaActual, totalPaginas, itemsPorPagina, vistaCompacta) {
  const contador = document.getElementById('contadorResultados');
  if (contador) {
    contador.innerHTML = `${totalResultados} expediente(s) · Página ${paginaActual} de ${totalPaginas}`;
  }
  
  const pagDiv = document.getElementById('paginationControls');
  if (pagDiv) {
    pagDiv.innerHTML = `
      <div style="display: flex; gap: 12px; align-items: center;">
        <button ${paginaActual === 1 ? 'disabled' : ''} data-pagina="anterior" class="btn-small btn-outline">◀ Anterior</button>
        <span>Página ${paginaActual} de ${totalPaginas}</span>
        <button ${paginaActual === totalPaginas ? 'disabled' : ''} data-pagina="siguiente" class="btn-small btn-outline">Siguiente ▶</button>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <select id="itemsPorPaginaSelect" class="btn-small btn-outline" style="padding: 4px 8px;">
          ${[5,10,20,50,100].map(n => `<option value="${n}" ${itemsPorPagina === n ? 'selected' : ''}>${n} por página</option>`).join('')}
        </select>
        <button id="toggleVistaBtn" class="btn-small btn-outline" title="Cambiar vista">
          ${vistaCompacta ? '📋 Vista normal' : '📄 Vista compacta'}
        </button>
      </div>
    `;
  }
}