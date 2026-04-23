import { abrirBaseDatos } from './db.js';

export async function obtenerPlazos() {
  const db = await abrirBaseDatos();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["plazos"], "readonly");
    const store = tx.objectStore("plazos");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function guardarPlazos(plazos) {
  const db = await abrirBaseDatos();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["plazos"], "readwrite");
    const store = tx.objectStore("plazos");
    store.clear();
    plazos.forEach(p => { if (p.id) store.put(p); });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}