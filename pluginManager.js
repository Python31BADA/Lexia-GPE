import { mostrarNotificacion } from '../utils/notificaciones.js';

class PluginAPI {
  constructor(store) {
    this.store = store;
    this._initFns = [];
  }
  onInit(fn) { if (typeof fn === 'function') this._initFns.push(fn); }
  notificar(titulo, cuerpo) { mostrarNotificacion(titulo, cuerpo); }
  getExpedientes() { return this.store.expedientes; }
  agregarBoton(texto, onClick) {
    const header = document.querySelector('.header-actions');
    if (header) {
      const btn = document.createElement('button');
      btn.className = 'btn-outline';
      btn.textContent = texto;
      btn.onclick = onClick;
      header.appendChild(btn);
    }
  }
  registrarComando(tecla, fn) {
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === tecla) { e.preventDefault(); fn(); }
    });
  }
  ejecutarInits() { this._initFns.forEach(fn => { try { fn(); } catch(e) { console.error(e); } }); }
}

export async function cargarPlugins(store) {
  const api = new PluginAPI(store);
  window.appAPI = api;

  if (!window.electronAPI) {
    console.warn('Electron API no disponible, plugins desactivados');
    return;
  }

  const plugins = window.electronAPI.plugins;
  const pluginDir = plugins.joinPath(window.electronAPI.__dirname, 'plugins');

  try {
    if (!plugins.existsSync(pluginDir)) {
      plugins.mkdirSync(pluginDir);
      const ejemplo = `// Ejemplo de plugin para ONBC Expedientes
app.onInit(() => {
  app.notificar('Plugin cargado', 'El sistema de plugins funciona correctamente');
  app.agregarBoton('✨ Plugin', () => alert('¡Hola desde el plugin!'));
  app.registrarComando('P', () => alert('Comando Ctrl+Shift+P ejecutado'));
});`;
      plugins.writeFileSync(plugins.joinPath(pluginDir, 'ejemplo.js'), ejemplo);
    }

    const archivos = plugins.readdirSync(pluginDir).filter(f => f.endsWith('.js'));
    for (const archivo of archivos) {
      const ruta = plugins.joinPath(pluginDir, archivo);
      const codigo = plugins.readFileSync(ruta, 'utf-8');
      try {
        const fn = new Function('app', codigo);
        fn(api);
        console.log(`✅ Plugin cargado: ${archivo}`);
      } catch (err) {
        console.error(`❌ Error en plugin ${archivo}:`, err);
      }
    }
    api.ejecutarInits();
  } catch (err) {
    console.error('Error al cargar plugins:', err);
  }
}