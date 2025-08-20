// Test para verificar que apiUrl funciona correctamente
console.log('Testing apiUrl function...');

// Simular variables de entorno
process.env.NEXT_PUBLIC_BASE_PATH = '/dashboard-monitor';

// Función apiUrl copiada del utils
function apiUrl(path) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${basePath}/api/${cleanPath}`;
}

// Pruebas
console.log('documents/approve =>', apiUrl('documents/approve'));
console.log('documents/reject =>', apiUrl('documents/reject'));
console.log('postulations/management =>', apiUrl('postulations/management'));
