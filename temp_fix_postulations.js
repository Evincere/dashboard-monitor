// Script para arreglar el problema de carga de postulaciones
const fs = require('fs');

const filePath = 'src/app/(dashboard)/postulations/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Encontrar el useEffect que carga las postulaciones iniciales
const useEffectRegex = /useEffect\(\(\) => \{[\s\S]*?fetchPostulations\(1, false\);[\s\S]*?\}, \[\]\);/;

// Reemplazar con una versión que carga todo de una vez
const newUseEffect = `useEffect(() => {
    // Cargar estadísticas rápido primero
    fetchStats();
    // Luego cargar TODAS las postulaciones de una vez (página 0 para cargar todo)
    const timeoutId = setTimeout(() => {
      fetchPostulations(0, false);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, []);`;

content = content.replace(useEffectRegex, newUseEffect);

fs.writeFileSync(filePath, content);
console.log('✅ Componente de postulaciones actualizado para cargar todo de una vez');
