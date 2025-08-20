// Script para arreglar la lógica de paginación cuando cargamos todo en página 0
const fs = require('fs');

const filePath = 'src/app/(dashboard)/postulations/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Quitar la lógica de "cargar más" porque ya cargamos todo
// Buscar el botón de "Cargar más" y ocultarlo cuando tenemos todas las postulaciones
content = content.replace(
  /currentPage < totalPages && \(\s*<Button[\s\S]*?<\/Button>\s*\)/,
  '/* Todas las postulaciones cargadas de una vez - no necesitamos "Cargar más" */ false && ('
);

// También vamos a simplificar la condición de mostrar "todas cargadas"
content = content.replace(
  /currentPage >= totalPages && totalPages > 1 &&/,
  'postulations.length > 0 &&'
);

fs.writeFileSync(filePath, content);
console.log('✅ Lógica de paginación ajustada para carga completa');
