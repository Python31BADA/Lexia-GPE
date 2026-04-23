
// Lexia Loader v3.0 - Protegido
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
