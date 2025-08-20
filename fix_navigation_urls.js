// Script para corregir las URLs de navegación que están causando doble prefix
const fs = require('fs');

const filePath = 'src/app/(dashboard)/postulations/[dni]/documents/validation/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Reemplazar todas las instancias de routeUrl con URLs simples (sin prefix)
// porque Next.js ya agrega el basePath automáticamente para router.push()

content = content.replace(
  /routeUrl\(`postulations\/\$\{([^}]+)\}\/documents\/validation`\)/g,
  '`/postulations/${$1}/documents/validation`'
);

content = content.replace(
  /routeUrl\('postulations'\)/g,
  "'/postulations'"
);

// También agregar logs para debug
content = content.replace(
  /const targetUrl = (`\/postulations\/.*`);/g,
  '$1\n        console.log("🎯 Navegación a:", targetUrl);'
);

fs.writeFileSync(filePath, content);
console.log('✅ URLs de navegación corregidas para evitar doble prefijo');
