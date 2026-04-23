// Módulo central de conexión a IndexedDB - versión robusta
let dbInstance = null;
let dbPromise = null;

export function abrirBaseDatos() {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbPromise) return dbPromise;

  console.log('🔄 Intentando abrir IndexedDB...');
  
  dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB no está soportada en este navegador'));
      return;
    }

    const solicitud = window.indexedDB.open("ONBC_DB", 4); // Versión incrementada para incluir plazos

    solicitud.onerror = (event) => {
      console.error('❌ Error al abrir IndexedDB:', event.target.error);
      reject(new Error(`Error IndexedDB: ${event.target.error?.message || 'desconocido'}`));
    };

    solicitud.onsuccess = (event) => {
      dbInstance = event.target.result;
      console.log('✅ IndexedDB abierta correctamente');
      
      dbInstance.onclose = () => {
        console.warn('⚠️ IndexedDB cerrada inesperadamente');
        dbInstance = null;
        dbPromise = null;
      };
      
      resolve(dbInstance);
    };

    solicitud.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log('📦 Actualizando estructura de IndexedDB...');
      
      if (!db.objectStoreNames.contains("expedientes")) {
        db.createObjectStore("expedientes", { keyPath: "id" });
        console.log('  - Store "expedientes" creado');
      }
      if (!db.objectStoreNames.contains("config")) {
        db.createObjectStore("config", { keyPath: "id" });
        console.log('  - Store "config" creado');
      }
      if (!db.objectStoreNames.contains("plazos")) {
        const store = db.createObjectStore("plazos", { keyPath: "id" });
        store.createIndex("fechaVence", "fechaVence");
        store.createIndex("expedienteId", "expedienteId");
        console.log('  - Store "plazos" creado con índices');
      }
    };
  });

  return dbPromise;
}

export function cerrarBaseDatos() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    dbPromise = null;
    console.log('🔒 IndexedDB cerrada');
  }
}