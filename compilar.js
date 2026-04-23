// compilar.js - Compila código fuente a bytecode (sin ofuscar)
import fs from 'fs';
import path from 'path';
import bytenode from 'bytenode';

console.log('🔒 Compilando a bytecode...\n');

const dirDestino = './core';
if (!fs.existsSync(dirDestino)) {
    fs.mkdirSync(dirDestino);
}

const archivos = [
    { origen: 'script.js', destino: 'app.jsc' },
    { origen: 'src/ui/renderer.js', destino: 'renderer.jsc' },
    { origen: 'src/ui/formulario.js', destino: 'form.jsc' },
    { origen: 'src/database/expedientesStore.js', destino: 'store.jsc' },
    { origen: 'src/database/plazosStore.js', destino: 'plazos.jsc' },
    { origen: 'src/database/db.js', destino: 'db.jsc' },
    { origen: 'src/utils/helpers.js', destino: 'helpers.jsc' },
    { origen: 'src/utils/validators.js', destino: 'validators.jsc' },
    { origen: 'src/utils/notificaciones.js', destino: 'notify.jsc' }
];

archivos.forEach(({ origen, destino }) => {
    const rutaOrigen = path.join('.', origen);
    const rutaDestino = path.join(dirDestino, destino);
    
    if (fs.existsSync(rutaOrigen)) {
        try {
            bytenode.compileFile(rutaOrigen, rutaDestino);
            console.log(`  ✅ ${origen} → ${destino}`);
        } catch (e) {
            console.log(`  ❌ Error con ${origen}: ${e.message}`);
        }
    } else {
        console.log(`  ⚠️ No encontrado: ${origen}`);
    }
});

console.log('\n✅ Bytecode generado en carpeta /core');