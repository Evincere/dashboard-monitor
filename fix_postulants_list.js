// Script para corregir la carga de la lista de postulantes
const fs = require('fs');

const filePath = 'src/app/(dashboard)/postulations/[dni]/documents/validation/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Reemplazar la llamada a backend/inscriptions con postulations/management
content = content.replace(
  /console\.log\('📡 Haciendo fetch a \/api\/backend\/inscriptions con tamaño=1000'\);[\s\S]*?const response = await fetch\(apiUrl\('backend\/inscriptions\?size=1000'\)\);/,
  `console.log('📡 Haciendo fetch a postulations/management para obtener todos los DNIs...');
      const response = await fetch('/dashboard-monitor/api/postulations/management?pageSize=300');`
);

// Actualizar el procesamiento de la respuesta para usar la estructura correcta
content = content.replace(
  /if \(data\.success && Array\.isArray\(data\.data\)\) \{[\s\S]*?const dniList = data\.data[\s\S]*?\.filter\(Boolean\);/,
  `if (data.success && Array.isArray(data.postulations)) {
        console.log('✅ Inscripciones cargadas exitosamente:', data.postulations.length);
        
        // Filtrar solo postulantes con documentos pendientes de validación
        const dniList = data.postulations
          .filter(post => post.validationStatus === 'PENDING')
          .map(post => post.user.dni)
          .filter(Boolean);`
);

fs.writeFileSync(filePath, content);
console.log('✅ Lista de postulantes corregida para usar endpoint correcto');
