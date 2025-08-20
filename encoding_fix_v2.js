const fs = require('fs');

// Leer el archivo
const content = fs.readFileSync('src/app/api/postulations/management/route.ts', 'utf8');

// Función de limpieza mejorada y corregida
const improvedEncodingFix = `
        // Limpiar encoding con mapeo completo y corregido
        const cleanResult = result
          .replace(/N�/g, 'N°')      // N° específico (PRIORITARIO)
          .replace(/Luj�n/g, 'Luján') // Luján específico (PRIORITARIO)
          .replace(/Ã¡/g, 'á')       // á
          .replace(/Ã©/g, 'é')       // é  
          .replace(/Ã­/g, 'í')       // í
          .replace(/Ã³/g, 'ó')       // ó
          .replace(/Ãº/g, 'ú')       // ú
          .replace(/Ã±/g, 'ñ')       // ñ
          .replace(/�/g, 'á')        // � como fallback para á (corregido)
          .replace(/Â°/g, '°')       // símbolo de grado ° 
          .replace(/Âº/g, 'º')       // símbolo ordinal masculino
          .replace(/Âª/g, 'ª')       // símbolo ordinal femenino
          .replace(/Ã¼/g, 'ü')       // ü
          .replace(/Ã /g, 'à')       // à
          .replace(/Ã¨/g, 'è')       // è
          .replace(/Ã¬/g, 'ì')       // ì
          .replace(/Ã²/g, 'ò')       // ò
          .replace(/Ã¹/g, 'ù')       // ù
          .trim();`;

// Reemplazar la función de limpieza existente
const fixed = content.replace(
  /\/\/ Limpiar encoding[\s\S]*?\.trim\(\);/,
  improvedEncodingFix
);

// Escribir el archivo arreglado
fs.writeFileSync('src/app/api/postulations/management/route.ts', fixed);
console.log('✅ Applied improved encoding cleanup with correct Luján mapping');
