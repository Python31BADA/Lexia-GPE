// src/utils/notificaciones.js
export function mostrarNotificacion(titulo, cuerpo = '') {
  // Si estamos en Electron y la API está disponible
  if (window.electronAPI?.mostrarNotificacion) {
    window.electronAPI.mostrarNotificacion(titulo, cuerpo);
    return;
  }
  
  // Fallback para navegador normal
  if (window.Notification && Notification.permission === 'granted') {
    new Notification(titulo, { body: cuerpo });
  } else if (window.Notification && Notification.permission !== 'denied') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') new Notification(titulo, { body: cuerpo });
    });
  }
}