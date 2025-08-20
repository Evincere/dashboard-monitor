const fs = require('fs');

// Leer el archivo
const content = fs.readFileSync('src/app/api/postulations/management/route.ts', 'utf8');

// Reemplazar la línea que causa el problema
const fixed = content.replace(
  /const \[usersResponse, inscriptionsResponse\] = await Promise\.all\(\[\s*backendClient\.getUsers\({ size: 1000 }\),\s*backendClient\.getInscriptions\({ size: 1000 }\)\s*\]\);/,
  'const inscriptionsResponse = await backendClient.request("/admin/inscriptions?size=1000");'
);

// Reemplazar las validaciones
const fixed2 = fixed.replace(
  /if \(!usersResponse\.success \|\| !inscriptionsResponse\.success\) \{\s*throw new Error\('Failed to fetch users or inscriptions'\);\s*\}/,
  'if (!inscriptionsResponse.success) { throw new Error("Failed to fetch inscriptions"); }'
);

// Reemplazar el acceso a datos
const fixed3 = fixed2.replace(
  /const users = usersResponse\.data\?.content \|\| \[\];\s*const inscriptions = inscriptionsResponse\.data\?.content \|\| \[\];/,
  'const inscriptions = inscriptionsResponse.data?.content || [];'
);

// Reemplazar la línea que usa usersById
const fixed4 = fixed3.replace(
  /const usersById = new Map\(users\.map\(\(user: any\) => \[user\.id, user\]\)\);/,
  '// Users info is already included in inscriptions'
);

// Reemplazar el procesamiento de batch
const fixed5 = fixed4.replace(
  /const user = usersById\.get\(inscription\.userId\);\s*if \(!user\) return null;\s*const dni = user\.dni \|\| user\.username;\s*if \(!dni\) return null;/,
  'if (!inscription.userInfo?.dni) return null; const dni = inscription.userInfo.dni;'
);

// Reemplazar la información del usuario en el resultado
const fixed6 = fixed5.replace(
  /user: \{\s*dni: dni,\s*fullName: user\.fullName \|\| `\${user\.firstName \|\| ''} \${user\.lastName \|\| ''}`.trim\(\) \|\| user\.name \|\| 'Sin nombre',\s*email: user\.email \|\| 'sin-email@mpd\.gov\.ar'\s*\},/,
  'user: { dni: dni, fullName: inscription.userInfo.fullName, email: inscription.userInfo.email },'
);

// Escribir el archivo arreglado
fs.writeFileSync('src/app/api/postulations/management/route.ts', fixed6);
console.log('✅ Fixed postulations management route');
