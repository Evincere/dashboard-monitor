const fs = require('fs');

// Leer el archivo
const content = fs.readFileSync('src/app/api/postulations/management/route.ts', 'utf8');

// Mejorar la función de limpieza de encoding
const improvedEncodingFix = `
        // Limpiar encoding con mapeo más completo
        const cleanResult = result
          .replace(/Ã¡/g, 'á')     // á
          .replace(/Ã©/g, 'é')     // é  
          .replace(/Ã­/g, 'í')     // í
          .replace(/Ã³/g, 'ó')     // ó
          .replace(/Ãº/g, 'ú')     // ú
          .replace(/Ã±/g, 'ñ')     // ñ
          .replace(/Ã/g, 'í')      // í (fallback)
          .replace(/ÃÂ°/g, '°')    // símbolo de grado °
          .replace(/Â°/g, '°')     // símbolo de grado ° (alternativo)
          .replace(/N�/g, 'N°')    // N° específico  
          .replace(/�/g, 'ó')      // ó como fallback para �
          .replace(/â„¢/g, '°')    // otro encoding del símbolo de grado
          .replace(/Âº/g, 'º')     // símbolo ordinal masculino
          .replace(/Âª/g, 'ª')     // símbolo ordinal femenino
          .replace(/Ã¼/g, 'ü')     // ü
          .replace(/Ã‡/g, 'Ç')     // Ç
          .replace(/Ã§/g, 'ç')     // ç
          .replace(/Ã /g, 'à')     // à
          .replace(/Ã¨/g, 'è')     // è
          .replace(/Ã¬/g, 'ì')     // ì
          .replace(/Ã²/g, 'ò')     // ò
          .replace(/Ã¹/g, 'ù')     // ù
          .replace(/Ã„/g, 'Ä')     // Ä
          .replace(/Ã¤/g, 'ä')     // ä
          .replace(/Ã–/g, 'Ö')     // Ö
          .replace(/Ã¶/g, 'ö')     // ö
          .replace(/Ãœ/g, 'Ü')     // Ü
          .replace(/â€™/g, "'")    // apostrofe
          .replace(/â€œ/g, '"')    // comilla doble izquierda
          .replace(/â€/g, '"')     // comilla doble derecha
          .replace(/â€"/g, '–')    // guión en dash
          .replace(/â€"/g, '—')    // guión em dash
          .trim();`;

// Reemplazar la función de limpieza existente
const fixed = content.replace(
  /\/\/ Limpiar encoding[\s\S]*?\.trim\(\);/,
  improvedEncodingFix
);

// Escribir el archivo arreglado
fs.writeFileSync('src/app/api/postulations/management/route.ts', fixed);
console.log('✅ Improved encoding cleanup function');
