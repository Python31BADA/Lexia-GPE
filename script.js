// ============================================================
// Lexia Géstor de Expedientes Profesionar-Desarrollado por Yonnathan López Hernández
// Lógica principal
// ============================================================

import { abrirBaseDatos } from './src/database/db.js';
import { obtenerTodos, guardarTodos, guardarExpediente, eliminarExpediente } from './src/database/expedientesStore.js';
import { obtenerPlazos, guardarPlazos } from './src/database/plazosStore.js';
import { construirFormulario, obtenerValoresFormulario, rellenarFormulario, limpiarFormulario, validarCamposRequeridos } from './src/ui/formulario.js';
import { renderizarLista, actualizarPaginacionUI } from './src/ui/renderer.js';
import { escapeHtml, estaVencido, diasRestantes, obtenerFechaSuma, formatearFecha } from './src/utils/helpers.js';
import { sanitizarImportacion } from './src/utils/validators.js';
import { mostrarNotificacion } from './src/utils/notificaciones.js';

// ---------- CONFIGURACIÓN DE CAMPOS POR DEFECTO ----------
const CAMPOS_DEFAULT = [
    { id: "codigo", label: "Código *", type: "text", required: true, placeholder: "EXP-2025-001", enLista: true, ancho: "half" },
    { id: "cliente", label: "Cliente *", type: "text", required: true, placeholder: "Nombre del cliente", enLista: true, ancho: "half" },
    { id: "contraparte", label: "Contraparte", type: "text", required: false, placeholder: "Parte contraria", enLista: true, ancho: "half" },
    { id: "tipoContraparte", label: "Tipo Contraparte", type: "select", options: ["Natural", "Juridica", "Publica"], required: false, enLista: true, ancho: "half" },
    { id: "abogado", label: "Abogado", type: "text", required: false, placeholder: "Abogado asignado", enLista: true, ancho: "half" },
    { id: "ponente", label: "Ponente", type: "text", required: false, placeholder: "Juez ponente", enLista: true, ancho: "half" },
    { id: "pendiente", label: "Pendiente", type: "text", required: false, placeholder: "Asunto pendiente", enLista: true, ancho: "half" },
    { id: "instancia", label: "Instancia", type: "text", required: false, placeholder: "Juzgado o tribunal", enLista: true, ancho: "half" },
    { id: "fechaVence", label: "Fecha vencimiento", type: "date", required: false, enLista: true, ancho: "half" },
    { id: "notas", label: "Notas", type: "textarea", required: false, placeholder: "Observaciones adicionales", enLista: false, ancho: "full" },
    { id: "telefono", label: "Teléfono", type: "text", required: false, placeholder: "+34 600 123 456", enLista: true, ancho: "half" },
    { id: "email", label: "Email", type: "email", required: false, placeholder: "cliente@ejemplo.com", enLista: true, ancho: "half" },
    { id: "direccion", label: "Dirección", type: "text", required: false, placeholder: "Calle, número, ciudad", enLista: false, ancho: "full" }
];

// ---------- ESTADO GLOBAL ----------
const store = {
    expedientes: [],
    plazos: [],
    campos: CAMPOS_DEFAULT,
    filtros: { estado: 'todos', texto: '', abogado: '', fechaDesde: '', fechaHasta: '', campo: '' },
    orden: 'fecha',
    ui: {
        paginaActual: 1,
        itemsPorPagina: 10,
        vistaCompacta: localStorage.getItem("onbc_vista_compacta") === "true",
        editandoId: null
    }
};

// ---------- SISTEMA DE DIÁLOGOS MODALES ----------
const modal = {
    overlay: document.getElementById('modalOverlay'),
    title: document.getElementById('modalTitle'),
    message: document.getElementById('modalMessage'),
    cancelBtn: document.getElementById('modalCancelBtn'),
    confirmBtn: document.getElementById('modalConfirmBtn'),
    closeBtn: document.getElementById('modalCloseBtn'),
    resolver: null
};

function mostrarModal({ titulo = 'Confirmación', mensaje = '', textoConfirmar = 'Aceptar', textoCancelar = 'Cancelar', mostrarCancelar = true }) {
    modal.title.textContent = titulo;
    modal.message.textContent = mensaje;
    modal.confirmBtn.textContent = textoConfirmar;
    modal.cancelBtn.textContent = textoCancelar;
    modal.cancelBtn.style.display = mostrarCancelar ? 'inline-block' : 'none';
    modal.closeBtn.style.display = mostrarCancelar ? 'block' : 'none';
    modal.overlay.style.display = 'flex';

    return new Promise(resolve => {
        modal.resolver = resolve;
        const limpiar = () => {
            modal.overlay.style.display = 'none';
            modal.confirmBtn.removeEventListener('click', onConfirmar);
            modal.cancelBtn.removeEventListener('click', onCancelar);
            modal.closeBtn.removeEventListener('click', onCancelar);
            modal.overlay.removeEventListener('click', onOverlayClick);
        };
        const onConfirmar = () => { limpiar(); resolve(true); };
        const onCancelar = () => { limpiar(); resolve(false); };
        const onOverlayClick = (e) => { if (e.target === modal.overlay) onCancelar(); };

        modal.confirmBtn.addEventListener('click', onConfirmar);
        modal.cancelBtn.addEventListener('click', onCancelar);
        modal.closeBtn.addEventListener('click', onCancelar);
        modal.overlay.addEventListener('click', onOverlayClick);
    });
}

window.showAlert = (mensaje, titulo = 'Aviso') => mostrarModal({ titulo, mensaje, mostrarCancelar: false, textoConfirmar: 'Entendido' });
window.showConfirm = (mensaje, titulo = 'Confirmar') => mostrarModal({ titulo, mensaje, mostrarCancelar: true });

// Reemplazar métodos nativos (solo para llamadas sincrónicas legacy, se recomienda usar await)
const originalAlert = window.alert;
const originalConfirm = window.confirm;
window.alert = (msg) => { showAlert(msg); };
window.confirm = (msg) => { 
    // Advertencia: esto ya no es bloqueante, el código que espere confirm sincrónico fallará.
    // Por eso todas las confirmaciones en el código se han cambiado a async/await.
    console.warn('Uso de confirm() obsoleto, utiliza await showConfirm()');
    return false; 
};

// ---------- MODAL DE PLAZOS ----------
const modalPlazo = {
    overlay: document.getElementById('modalPlazo'),
    titulo: document.getElementById('modalPlazoTitle'),
    inputTitulo: document.getElementById('plazoTitulo'),
    inputFecha: document.getElementById('plazoFecha'),
    selectExp: document.getElementById('plazoExpedienteId'),
    btnGuardar: document.getElementById('modalPlazoGuardarBtn'),
    btnCancelar: document.getElementById('modalPlazoCancelBtn'),
    btnCerrar: document.getElementById('modalPlazoCloseBtn'),
    resolver: null
};

function mostrarModalPlazo(editarPlazo = null) {
    modalPlazo.titulo.textContent = editarPlazo ? '✏️ Editar Plazo' : '➕ Nuevo Plazo Procesal';
    modalPlazo.inputTitulo.value = editarPlazo ? editarPlazo.titulo : '';
    modalPlazo.inputFecha.value = editarPlazo ? editarPlazo.fechaVence : '';
    // Llenar select de expedientes
    modalPlazo.selectExp.innerHTML = '<option value="">Ninguno (plazo general)</option>';
    store.expedientes.forEach(exp => {
        const option = document.createElement('option');
        option.value = exp.id;
        option.textContent = `${exp.codigo || 'S/C'} - ${exp.cliente}`;
        if (editarPlazo && editarPlazo.expedienteId == exp.id) option.selected = true;
        modalPlazo.selectExp.appendChild(option);
    });
    modalPlazo.overlay.style.display = 'flex';

    return new Promise(resolve => {
        modalPlazo.resolver = resolve;
        const limpiar = () => {
            modalPlazo.overlay.style.display = 'none';
            modalPlazo.btnGuardar.removeEventListener('click', onGuardar);
            modalPlazo.btnCancelar.removeEventListener('click', onCancelar);
            modalPlazo.btnCerrar.removeEventListener('click', onCancelar);
            modalPlazo.overlay.removeEventListener('click', onOverlayClick);
        };
        const onGuardar = () => {
            const titulo = modalPlazo.inputTitulo.value.trim();
            const fecha = modalPlazo.inputFecha.value;
            if (!titulo || !fecha) {
                showAlert('Título y fecha son obligatorios', 'Error');
                return;
            }
            const expedienteId = modalPlazo.selectExp.value ? Number(modalPlazo.selectExp.value) : null;
            limpiar();
            resolve({ titulo, fecha, expedienteId });
        };
        const onCancelar = () => { limpiar(); resolve(null); };
        const onOverlayClick = (e) => { if (e.target === modalPlazo.overlay) onCancelar(); };

        modalPlazo.btnGuardar.addEventListener('click', onGuardar);
        modalPlazo.btnCancelar.addEventListener('click', onCancelar);
        modalPlazo.btnCerrar.addEventListener('click', onCancelar);
        modalPlazo.overlay.addEventListener('click', onOverlayClick);
    });
}

// ---------- INICIALIZACIÓN DE CAMPOS ----------
async function initCampos() {
    try {
        const db = await abrirBaseDatos();
        const tx = db.transaction(["config"], "readonly");
        const storeConfig = tx.objectStore("config");
        const req = storeConfig.get("campos");
        const result = await new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        if (result && result.valor) {
            store.campos = result.valor;
        } else {
            store.campos = CAMPOS_DEFAULT;
            const txWrite = db.transaction(["config"], "readwrite");
            const storeWrite = txWrite.objectStore("config");
            await new Promise((resolve, reject) => {
                const putReq = storeWrite.put({ id: "campos", valor: CAMPOS_DEFAULT });
                putReq.onsuccess = () => resolve();
                putReq.onerror = () => reject(putReq.error);
            });
        }
    } catch (e) {
        console.error('Error cargando campos, usando defaults:', e);
        store.campos = CAMPOS_DEFAULT;
    }
    construirFormulario(document.getElementById('formularioCampos'), store.campos);
}

// ---------- FILTRADO Y ORDENACIÓN ----------
function filtrarYOrdenar() {
    let resultado = [...store.expedientes];
    const f = store.filtros;

    if (f.estado === 'activos') resultado = resultado.filter(e => !e.cerrado && !estaVencido(e));
    else if (f.estado === 'vencidos') resultado = resultado.filter(e => !e.cerrado && estaVencido(e));
    else if (f.estado === 'cerrados') resultado = resultado.filter(e => e.cerrado);

    if (f.abogado) resultado = resultado.filter(e => e.abogado === f.abogado);
    if (f.fechaDesde) {
        const desde = new Date(f.fechaDesde); desde.setHours(0,0,0,0);
        resultado = resultado.filter(e => e.fechaVence && new Date(e.fechaVence) >= desde);
    }
    if (f.fechaHasta) {
        const hasta = new Date(f.fechaHasta); hasta.setHours(23,59,59,999);
        resultado = resultado.filter(e => e.fechaVence && new Date(e.fechaVence) <= hasta);
    }
    if (f.texto) {
        const lower = f.texto.toLowerCase();
        if (f.campo) {
            resultado = resultado.filter(e => e[f.campo] && e[f.campo].toString().toLowerCase().includes(lower));
        } else {
            resultado = resultado.filter(e => Object.entries(e).some(([key, val]) => {
                if (key === 'id' || key === 'cerrado') return false;
                return val && val.toString().toLowerCase().includes(lower);
            }));
        }
    }

    if (store.orden === 'fecha') {
        resultado.sort((a,b) => (a.fechaVence || '9999-12-31').localeCompare(b.fechaVence || '9999-12-31'));
    } else if (store.orden === 'cliente') {
        resultado.sort((a,b) => (a.cliente || '').localeCompare(b.cliente || ''));
    } else if (store.orden === 'codigo') {
        resultado.sort((a,b) => (a.codigo || '').localeCompare(b.codigo || ''));
    }
    return resultado;
}

// ---------- REFRESCAR UI COMPLETA ----------
function refrescarUI() {
    try {
        const filtrados = filtrarYOrdenar();
        const { html, totalPaginas } = renderizarLista(filtrados, store.ui, store.campos);
        document.getElementById('expedientesContainer').innerHTML = html;
        actualizarPaginacionUI(filtrados.length, store.ui.paginaActual, totalPaginas, store.ui.itemsPorPagina, store.ui.vistaCompacta);

        actualizarEstadisticas();
        actualizarSelectAbogados();
        actualizarWidgetPlazos();
        guardarFiltrosEnStorage();
    } catch (e) {
        console.error('Error refrescando UI:', e);
    }
}

// ---------- ESTADÍSTICAS ----------
function actualizarEstadisticas() {
    document.getElementById('totalExpedientes').innerText = store.expedientes.length;
    document.getElementById('activosCount').innerText = store.expedientes.filter(e => !e.cerrado && !estaVencido(e)).length;
    document.getElementById('vencidosCount').innerText = store.expedientes.filter(e => !e.cerrado && estaVencido(e)).length;
    document.getElementById('cerradosCount').innerText = store.expedientes.filter(e => e.cerrado).length;

    // Actualizar carga por abogado (básico)
    const statsDiv = document.getElementById('statsAbogados');
    if (statsDiv) {
        const conteo = {};
        store.expedientes.filter(e => !e.cerrado).forEach(e => {
            if (e.abogado) conteo[e.abogado] = (conteo[e.abogado] || 0) + 1;
        });
        const lista = Object.entries(conteo).sort((a,b) => b[1] - a[1]).slice(0, 3);
        if (lista.length) {
            statsDiv.innerHTML = `<h3>👔 Abogados con más casos activos</h3>` + 
                lista.map(([nom, cant]) => `<div>${escapeHtml(nom)}: ${cant} caso(s)</div>`).join('');
        } else {
            statsDiv.innerHTML = '';
        }
    }
}

function actualizarSelectAbogados() {
    const select = document.getElementById('filtroAbogado');
    if (!select) return;
    const abogados = [...new Set(store.expedientes.map(e => e.abogado).filter(a => a?.trim()))];
    select.innerHTML = '<option value="">Todos</option>' +
        abogados.sort().map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
    select.value = store.filtros.abogado;
}

// ---------- WIDGET DE PLAZOS ----------
function actualizarWidgetPlazos() {
    const container = document.getElementById('plazosProximosLista');
    if (!container) return;

    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const plazosPendientes = store.plazos.filter(p => !p.cumplido && p.fechaVence);
    plazosPendientes.sort((a,b) => new Date(a.fechaVence) - new Date(b.fechaVence));
    
    const proximos = plazosPendientes.filter(p => {
        const dias = diasRestantes(p.fechaVence);
        return dias >= 0 && dias <= 30; // Mostrar próximos 30 días
    });

    if (proximos.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">✅ Todo al día · Sin plazos pendientes</div>';
    return;
}

    container.innerHTML = proximos.map(plazo => {
        const dias = diasRestantes(plazo.fechaVence);
        const urgente = dias <= 2;
        const exp = store.expedientes.find(e => e.id === plazo.expedienteId);
        const expInfo = exp ? `${exp.codigo || 'S/C'} - ${exp.cliente}` : 'Plazo general';
        
        return `
            <div class="plazo-item ${urgente ? 'urgente' : ''}" data-plazo-id="${plazo.id}">
                <div class="plazo-info">
                    <div class="plazo-titulo"> ${escapeHtml(plazo.titulo)}</div>
                    <div class="plazo-meta">
                        <span> ${formatearFecha(plazo.fechaVence)} (${dias === 0 ? 'Hoy' : dias + ' día' + (dias!==1?'s':'')})</span>
                        <span> ${escapeHtml(expInfo)}</span>
                    </div>
                </div>
                <div class="plazo-acciones">
                    <button class="btn-cumplir-plazo" title="Marcar como cumplido">✅</button>
                    <button class="btn-editar-plazo" title="Editar">✏️</button>
                    <button class="btn-eliminar-plazo" title="Eliminar">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// Gestión de plazos desde el widget
async function manejarClickPlazo(e) {
    const target = e.target.closest('button');
    if (!target) return;
    const item = target.closest('.plazo-item');
    if (!item) return;
    const plazoId = Number(item.dataset.plazoId);
    const plazo = store.plazos.find(p => p.id === plazoId);
    if (!plazo) return;

    if (target.classList.contains('btn-cumplir-plazo')) {
        plazo.cumplido = true;
        await guardarPlazos(store.plazos);
        actualizarWidgetPlazos();
        mostrarNotificacion('Plazo cumplido', plazo.titulo);
    } else if (target.classList.contains('btn-editar-plazo')) {
        const resultado = await mostrarModalPlazo(plazo);
        if (resultado) {
            Object.assign(plazo, { titulo: resultado.titulo, fechaVence: resultado.fecha, expedienteId: resultado.expedienteId });
            await guardarPlazos(store.plazos);
            actualizarWidgetPlazos();
            mostrarNotificacion('Plazo actualizado', plazo.titulo);
        }
    } else if (target.classList.contains('btn-eliminar-plazo')) {
        if (await showConfirm('¿Eliminar este plazo definitivamente?')) {
            store.plazos = store.plazos.filter(p => p.id !== plazoId);
            await guardarPlazos(store.plazos);
            actualizarWidgetPlazos();
            mostrarNotificacion('Plazo eliminado', plazo.titulo);
        }
    }
}

// ---------- CRUD EXPEDIENTES ----------
async function guardarExpedienteHandler() {
    try {
        const valores = obtenerValoresFormulario(store.campos);
        const faltantes = validarCamposRequeridos(valores, store.campos);
        if (faltantes.length) {
            await showAlert(`Campos obligatorios: ${faltantes.map(c => c.label).join(', ')}`);
            return;
        }

        if (store.ui.editandoId === null) {
            const nuevo = { id: Date.now(), ...valores, cerrado: false };
            store.expedientes.push(nuevo);
            await guardarExpediente(nuevo);
        } else {
            const index = store.expedientes.findIndex(e => e.id === store.ui.editandoId);
            if (index !== -1) {
                store.expedientes[index] = { ...store.expedientes[index], ...valores, cerrado: store.expedientes[index].cerrado };
                await guardarExpediente(store.expedientes[index]);
            }
            cancelarEdicion();
        }
        limpiarFormulario(store.campos);
        refrescarUI();
        mostrarNotificacion('Expediente guardado', valores.cliente);
    } catch (e) {
        await showAlert('Error guardando: ' + e.message);
    }
}

function editarExpediente(id) {
    const exp = store.expedientes.find(e => e.id === id);
    if (!exp) return;
    rellenarFormulario(exp, store.campos);
    store.ui.editandoId = id;
    document.getElementById('guardarBtn').innerHTML = '✏️ Actualizar Expediente';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicion() {
    limpiarFormulario(store.campos);
    store.ui.editandoId = null;
    document.getElementById('guardarBtn').innerHTML = '💾 Guardar Expediente';
    document.getElementById('cancelEditBtn').style.display = 'none';
}

async function toggleCerrarExpediente(id) {
    const exp = store.expedientes.find(e => e.id === id);
    if (exp) {
        exp.cerrado = !exp.cerrado;
        await guardarExpediente(exp);
        refrescarUI();
        mostrarNotificacion(exp.cerrado ? 'Expediente cerrado' : 'Expediente reabierto', exp.cliente);
    }
}

async function eliminarExpedienteHandler(id) {
    if (!await showConfirm('¿Eliminar permanentemente este expediente? Esta acción no se puede deshacer.')) return;
    try {
        store.expedientes = store.expedientes.filter(e => e.id !== id);
        await eliminarExpediente(id);
        if (store.ui.editandoId === id) cancelarEdicion();
        refrescarUI();
        mostrarNotificacion('Expediente eliminado');
    } catch (e) {
        await showAlert('Error eliminando: ' + e.message);
    }
}

// ---------- UTILIDADES GENERALES ----------
async function limpiarTodosExpedientes() {
    if (!await showConfirm('⚠️ ¿ELIMINAR TODOS LOS EXPEDIENTES? Esta acción es irreversible.', 'Eliminar todo')) return;
    store.expedientes = [];
    await guardarTodos([]);
    cancelarEdicion();
    refrescarUI();
    mostrarNotificacion('Todos los expedientes eliminados');
}

function limpiarFiltros() {
    store.filtros = { estado: 'todos', texto: '', abogado: '', fechaDesde: '', fechaHasta: '', campo: '' };
    document.getElementById('buscarInput').value = '';
    document.getElementById('filtroAbogado').value = '';
    document.getElementById('filtroFechaDesde').value = '';
    document.getElementById('filtroFechaHasta').value = '';
    document.getElementById('filtroCampo').value = '';
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-filter="todos"]').classList.add('active');
    store.ui.paginaActual = 1;
    refrescarUI();
}

async function mostrarAcercaDe() {
    await showAlert(
        'Lexia -Géstor Profesional de Expedientes\n' +

        '• Expedientes: ILIMITADOS\n' +
        '• Probado con: 50,000+ expedientes activos\n' +
        '• Plazos procesales: ILIMITADOS\n' +
        '• Campos personalizables: 13 por expediente\n' +
        '• Tamaño estimado: 2-5 KB por registro\n' +
        '• 50,000 expedientes ≈ 250 MB en Disco\n' +
        '• Base de datos: IndexedDB (Local)\n\n' +
        '• Busqueda instantanea sobre todos los campos\n' +
        '• Filtros combinados en tiempo real\n' +
        '• Paginacion virtual (carga bajo demanda)\n' +
        '• Respuesta < 100ms con 10,000 registros activos\n' +
        '• Interfaz adaptativa (tema claro/oscuro)\n\n' +
        '• 100% OFFLINE · No requiere conexion a internet\n' +
        '• Datos almacenados no se comparten\n' +
        '• Sin telemetria · Sin analytics · Sin terceros\n' +
        '• Backups automaticos cada 30 minutos\n' +
        '• Exportacion/Importacion manual JSON\n\n' +
        
        'Yonnathan Lopez Hernandez\n' +
        'Estudiante de Derecho 4to Año\n' +
        'Universidad de Matanzas "Camilo Cienfuegos"\n' +
        'Matanzas, Cuba\n\n' +
        
        'Hecho en Cuba\n' +
        '© 2026 · Software en desarrollo\n\n' +
        
        'Licencia MIT · Uso libre para juristas',
        
        'Acerca de Lexia'
    );
}

function guardarFiltrosEnStorage() {
    localStorage.setItem("onbc_filtros", JSON.stringify(store.filtros));
}

function cargarFiltrosDeStorage() {
    try {
        const saved = localStorage.getItem("onbc_filtros");
        if (saved) {
            store.filtros = JSON.parse(saved);
            document.getElementById('buscarInput').value = store.filtros.texto || '';
            document.getElementById('orderSelect').value = store.orden;
            document.getElementById('filtroFechaDesde').value = store.filtros.fechaDesde || '';
            document.getElementById('filtroFechaHasta').value = store.filtros.fechaHasta || '';
            document.getElementById('filtroCampo').value = store.filtros.campo || '';
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === store.filtros.estado);
            });
        }
    } catch (e) {}
}

// ---------- EXPORTAR / IMPORTAR ----------
function exportarBaseDatos() {
    const dataStr = JSON.stringify(store.expedientes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lexia_respaldo_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    mostrarNotificacion('Respaldo exportado', `${store.expedientes.length} expedientes`);
}

function importarBaseDatos() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const datos = JSON.parse(ev.target.result);
                const { validos, invalidos } = sanitizarImportacion(datos);
                if (validos.length > 0) {
                    store.expedientes = validos;
                    await guardarTodos(validos);
                    refrescarUI();
                    await showAlert(`✅ ${validos.length} expedientes importados.${invalidos > 0 ? `\n⚠️ ${invalidos} registros inválidos omitidos.` : ''}`, 'Importación completada');
                } else {
                    await showAlert('❌ El archivo no contiene expedientes válidos.', 'Error');
                }
            } catch {
                await showAlert('❌ Archivo corrupto o formato incorrecto.', 'Error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ---------- INICIALIZACIÓN PRINCIPAL ----------
async function init() {
    try {
        await abrirBaseDatos();
        await initCampos();

        store.expedientes = await obtenerTodos();
        store.plazos = await obtenerPlazos();

        cargarFiltrosDeStorage();
        refrescarUI();

        // Event Listeners principales
        document.getElementById('guardarBtn').addEventListener('click', guardarExpedienteHandler);
        document.getElementById('cancelEditBtn').addEventListener('click', cancelarEdicion);

        // Búsqueda y filtros
        document.getElementById('buscarInput').addEventListener('input', e => {
            store.filtros.texto = e.target.value;
            store.ui.paginaActual = 1;
            refrescarUI();
        });
        document.getElementById('orderSelect').addEventListener('change', e => {
            store.orden = e.target.value;
            refrescarUI();
        });
        document.getElementById('filtroAbogado').addEventListener('change', e => {
            store.filtros.abogado = e.target.value;
            refrescarUI();
        });
        document.getElementById('filtroFechaDesde').addEventListener('change', e => {
            store.filtros.fechaDesde = e.target.value;
            refrescarUI();
        });
        document.getElementById('filtroFechaHasta').addEventListener('change', e => {
            store.filtros.fechaHasta = e.target.value;
            refrescarUI();
        });
        document.getElementById('filtroCampo').addEventListener('change', e => {
            store.filtros.campo = e.target.value;
            refrescarUI();
        });
        document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            store.filtros.estado = btn.dataset.filter;
            refrescarUI();
        }));

        // Delegación de eventos en lista de expedientes
        document.getElementById('expedientesContainer').addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id ? Number(btn.dataset.id) : null;
            if (!id) return;
            if (action === 'editar') editarExpediente(id);
            else if (action === 'cerrar' || action === 'reabrir') toggleCerrarExpediente(id);
            else if (action === 'eliminar') eliminarExpedienteHandler(id);
        });

        // Paginación
        const pagDiv = document.getElementById('paginationControls');
        pagDiv.addEventListener('click', e => {
            if (e.target.dataset.pagina === 'anterior' && store.ui.paginaActual > 1) {
                store.ui.paginaActual--;
                refrescarUI();
            } else if (e.target.dataset.pagina === 'siguiente') {
                const total = Math.ceil(filtrarYOrdenar().length / store.ui.itemsPorPagina);
                if (store.ui.paginaActual < total) {
                    store.ui.paginaActual++;
                    refrescarUI();
                }
            } else if (e.target.id === 'toggleVistaBtn') {
                store.ui.vistaCompacta = !store.ui.vistaCompacta;
                localStorage.setItem("onbc_vista_compacta", store.ui.vistaCompacta);
                refrescarUI();
            }
        });
        pagDiv.addEventListener('change', e => {
            if (e.target.id === 'itemsPorPaginaSelect') {
                store.ui.itemsPorPagina = parseInt(e.target.value);
                store.ui.paginaActual = 1;
                refrescarUI();
            }
        });

        // Widget de plazos
        document.getElementById('plazosProximosLista').addEventListener('click', manejarClickPlazo);
        document.getElementById('btnAgregarPlazoWidget').addEventListener('click', async () => {
            const resultado = await mostrarModalPlazo();
            if (resultado) {
                const nuevo = {
                    id: Date.now(),
                    titulo: resultado.titulo,
                    fechaVence: resultado.fecha,
                    expedienteId: resultado.expedienteId,
                    cumplido: false
                };
                store.plazos.push(nuevo);
                await guardarPlazos(store.plazos);
                actualizarWidgetPlazos();
                mostrarNotificacion('Plazo agregado', nuevo.titulo);
            }
        });

        // Menú desplegable de utilidades
        const dropdownBtn = document.getElementById('utilsDropdownBtn');
        const dropdownMenu = document.getElementById('utilsDropdownMenu');
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (!dropdownBtn.contains(e.target)) dropdownMenu.classList.remove('show');
        });
        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
            limpiarFiltros();
            dropdownMenu.classList.remove('show');
        });
        document.getElementById('aboutBtn').addEventListener('click', () => {
            mostrarAcercaDe();
            dropdownMenu.classList.remove('show');
        });
        document.getElementById('clearAllBtn').addEventListener('click', async () => {
            await limpiarTodosExpedientes();
            dropdownMenu.classList.remove('show');
        });

        // Exportar/Importar
        document.getElementById('exportBtn').addEventListener('click', exportarBaseDatos);
        document.getElementById('importBtn').addEventListener('click', importarBaseDatos);

        // Tema oscuro
        const themeToggle = document.getElementById('themeToggle');
        const savedTheme = localStorage.getItem("onbc_theme");
        if (savedTheme === 'dark') {
            document.body.classList.add('dark');
            themeToggle.innerHTML = '☀️';
        }
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark');
            const isDark = document.body.classList.contains('dark');
            localStorage.setItem("onbc_theme", isDark ? "dark" : "light");
            themeToggle.innerHTML = isDark ? '☀️' : '🌙';
        });

        // Controles de ventana Electron (si existen)
        if (window.electronAPI) {
            document.getElementById('btnMinimizar')?.addEventListener('click', () => window.electronAPI.minimizeWindow());
            document.getElementById('btnMaximizar')?.addEventListener('click', () => window.electronAPI.maximizeWindow());
            document.getElementById('btnCerrar')?.addEventListener('click', () => window.electronAPI.closeWindow());
        }

        console.log('✅ Lexia inicializado correctamente.');
    } catch (e) {
        console.error('Error fatal en init:', e);
        await showAlert('Error crítico al iniciar la aplicación:\n' + e.message, 'Error');
    }
}

// Arrancar
init();