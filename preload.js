// preload.js - Exposición segura de APIs de Electron al renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Controles de ventana
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Notificaciones
  mostrarNotificacion: (titulo, cuerpo) => ipcRenderer.send('mostrar-notificacion', { titulo, cuerpo }),
  recibirNotificacion: (callback) => {
    ipcRenderer.on('mostrar-notificacion', (event, data) => callback(data));
  }
});