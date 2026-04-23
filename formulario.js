import { escapeHtml } from '../utils/helpers.js';

export function construirFormulario(container, campos) {
  if (!container) return;
  container.innerHTML = '';
  campos.forEach(campo => {
    const div = document.createElement('div');
    div.className = `form-group ${campo.ancho === 'full' ? 'full-width' : ''}`;
    const label = document.createElement('label');
    label.textContent = campo.label;
    div.appendChild(label);

    let input;
    if (campo.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 2;
      input.placeholder = campo.placeholder || '';
    } else if (campo.type === 'select') {
      input = document.createElement('select');
      (campo.options || []).forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        input.appendChild(option);
      });
    } else {
      input = document.createElement('input');
      input.type = campo.type;
      input.placeholder = campo.placeholder || '';
    }
    input.id = campo.id;
    if (campo.required) input.required = true;
    div.appendChild(input);
    container.appendChild(div);
  });
}

export function obtenerValoresFormulario(campos) {
  const valores = {};
  campos.forEach(campo => {
    const el = document.getElementById(campo.id);
    if (el) valores[campo.id] = el.value.trim();
  });
  return valores;
}

export function rellenarFormulario(expediente, campos) {
  campos.forEach(campo => {
    const el = document.getElementById(campo.id);
    if (el && expediente[campo.id] !== undefined) {
      el.value = expediente[campo.id];
    }
  });
}

export function limpiarFormulario(campos) {
  campos.forEach(campo => {
    const el = document.getElementById(campo.id);
    if (el) el.value = '';
  });
}

export function validarCamposRequeridos(valores, campos) {
  return campos.filter(c => c.required && !valores[c.id]);
}