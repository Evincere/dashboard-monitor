const fs = require('fs');

// Leer el archivo actual
const filePath = 'src/app/api/postulations/[dni]/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Corregir la línea problemática donde approved no está definido
const buggyLine = 'return { status: \'PENDING\', completionPercentage: Math.round(((approved + rejected) / documents.length) * 100) };';
const fixedLine = 'return { status: \'PENDING\', completionPercentage: 0 };';

content = content.replace(buggyLine, fixedLine);

// Escribir el archivo corregido
fs.writeFileSync(filePath, content);

console.log('✅ Bug de variable approved no definida corregido');
