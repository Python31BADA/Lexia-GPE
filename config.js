// ========== CONFIGURACIÓN DE CAMPOS ==========
// Aquí defines todos los campos que tendrá cada expediente.
// Cada campo tiene:
// - id: identificador interno (sin espacios, sin acentos)
// - label: texto que se muestra en el formulario
// - type: "text", "date", "textarea", "select" (por ahora text)
// - required: true/false
// - placeholder: texto de ayuda
// - enLista: si aparece en la vista de lista (true/false)
// - ancho: "full" (ocupa ambas columnas) o "half"

const CAMPOS_EXPEDIENTE = [
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
    // NUEVOS CAMPOS DE CONTACTO (los añadimos ahora)
    { id: "telefono", label: "Teléfono", type: "text", required: false, placeholder: "+34 600 123 456", enLista: true, ancho: "half" },
    { id: "email", label: "Email", type: "email", required: false, placeholder: "cliente@ejemplo.com", enLista: true, ancho: "half" },
    { id: "direccion", label: "Dirección", type: "text", required: false, placeholder: "Calle, número, ciudad", enLista: false, ancho: "full" }
];

// Nombre de la clave en localStorage (para no mezclar versiones)
const STORAGE_KEY = "onbc_expedientes_v4";

// Orden por defecto
const ORDEN_POR_DEFECTO = "fecha"; // "fecha", "cliente", "codigo"