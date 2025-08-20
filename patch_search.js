const fs = require('fs');

// Read the search file
let content = fs.readFileSync('/home/semper/dashboard-monitor/src/app/api/validation/search/route.ts', 'utf8');

// PATCH: Improve the circunscripcion mapping
const oldCircMapping = `if (centro.includes('primera')) circunscripcion = 'PRIMERA_CIRCUNSCRIPCION';
        else if (centro.includes('segunda')) circunscripcion = 'SEGUNDA_CIRCUNSCRIPCION';
        else if (centro.includes('tercera')) circunscripcion = 'TERCERA_CIRCUNSCRIPCION';
        else if (centro.includes('cuarta')) circunscripcion = 'CUARTA_CIRCUNSCRIPCION';
        else circunscripcion = 'PRIMERA_CIRCUNSCRIPCION'; // Default fallback`;

const newCircMapping = `if (centro.includes('primera') || centro.includes('1°') || centro.includes('1') || 
            centro.includes('capital') || centro.includes('mendoza')) {
          circunscripcion = 'PRIMERA_CIRCUNSCRIPCION';
        } else if (centro.includes('segunda') || centro.includes('2°') || centro.includes('2') || 
                   centro.includes('san rafael')) {
          circunscripcion = 'SEGUNDA_CIRCUNSCRIPCION';
        } else if (centro.includes('tercera') || centro.includes('3°') || centro.includes('3') || 
                   centro.includes('san martin') || centro.includes('san martín')) {
          circunscripcion = 'TERCERA_CIRCUNSCRIPCION';
        } else if (centro.includes('cuarta') || centro.includes('4°') || centro.includes('4') || 
                   centro.includes('tunuyan') || centro.includes('tunuyán')) {
          circunscripcion = 'CUARTA_CIRCUNSCRIPCION';
        } else {
          circunscripcion = 'PRIMERA_CIRCUNSCRIPCION'; // Default fallback
        }`;

content = content.replace(oldCircMapping, newCircMapping);

// Write the patched file
fs.writeFileSync('/home/semper/dashboard-monitor/src/app/api/validation/search/route.ts', content);
console.log('✅ Applied critical patches to search endpoint');
