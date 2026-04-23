import { abrirBaseDatos } from './db.js';

export async function obtenerTodos() {
  const db = await abrirBaseDatos();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["expedientes"], "readonly");
    const store = tx.objectStore("expedientes");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function guardarTodos(expedientes) {
  const db = await abrirBaseDatos();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["expedientes"], "readwrite");
    const store = tx.objectStore("expedientes");
    
    const clearReq = store.clear();
    clearReq.onerror = () => reject(clearReq.error);
    
    expedientes.forEach(exp => {
      if (exp.id) store.put(exp);
    });
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function guardarExpediente(expediente) {
  const db = await abrirBaseDatos();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["expedientes"], "readwrite");
    const store = tx.objectStore("expedientes");
    const req = store.put(expediente);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function eliminarExpediente(id) {
  const db = await abrirBaseDatos();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["expedientes"], "readwrite");
    const store = tx.objectStore("expedientes");
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}