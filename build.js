// build.js - Construcción protegida (solo bytecode)
import { execSync } from 'child_process';
import fs from 'fs';

console.log('🛡️ LEXIA · CONSTRUCCIÓN PROTEGIDA (BYTECODE)\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Limpiar builds anteriores
console.log('🧹 Limpiando builds anteriores...');
try {
    if (fs.existsSync('core')) fs.rmSync('core', { recursive: true, force: true });
    if (fs.existsSync('dist')) fs.rmSync('dist', { recursive: true, force: true });
    console.log('   ✅ Limpieza completada\n');
} catch (e) {
    console.log('   ⚠️ Nada que limpiar\n');
}

// Compilar a bytecode
console.log('🔒 COMPILANDO A BYTECODE');
execSync('node compilar.js', { stdio: 'inherit' });

// Crear loader
console.log('\n📦 Creando loader...');
const loader = `
import 'bytenode';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('⚖️ Lexia · Iniciando núcleo protegido...');

try {
    await import('./core/app.jsc');
    console.log('✅ Sistema cargado');
} catch (e) {
    console.warn('⚠️ Fallback a modo desarrollo');
    await import('./script.js');
}
`;
fs.writeFileSync('launcher.js', loader);
console.log('   ✅ Loader creado\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ CONSTRUCCIÓN PROTEGIDA COMPLETADA');
console.log('   • Archivos finales: BYTECODE (.jsc)');
console.log('   • Listo para empaquetar con Electron');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');