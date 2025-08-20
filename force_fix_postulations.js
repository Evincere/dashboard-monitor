// Script para forzar la carga correcta de todas las postulaciones
const fs = require('fs');

const filePath = 'src/app/(dashboard)/postulations/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Vamos a simplificar drásticamente el useEffect inicial
const oldUseEffect = /useEffect\(\(\) => \{[\s\S]*?return \(\) => clearTimeout\(timeoutId\);[\s\S]*?\}, \[\]\);/;

const newUseEffect = `useEffect(() => {
    console.log('🚀 Iniciando carga de postulaciones...');
    // Cargar estadísticas primero
    fetchStats();
    
    // Cargar TODAS las postulaciones directamente
    setTimeout(() => {
      console.log('📡 Cargando todas las postulaciones...');
      fetchPostulations(0, false);
    }, 1000);
  }, []);`;

content = content.replace(oldUseEffect, newUseEffect);

// También vamos a forzar que filteredPostulations se inicialice correctamente
// cuando postulations cambie, sin depender de los filtros complejos inicialmente
const oldFilterEffect = /useEffect\(\(\) => \{[\s\S]*?if \(postulations\.length > 0\) \{[\s\S]*?\}[\s\S]*?\}, \[postulations, statusFilter, validationFilter, priorityFilter, searchTerm, sortBy\]\);/;

const newFilterEffect = `useEffect(() => {
    console.log('🔄 Aplicando filtros a', postulations.length, 'postulaciones');
    if (postulations.length > 0) {
      // Primero mostrar todas las postulaciones sin filtrar
      if (statusFilter === 'ALL' && validationFilter === 'ALL' && priorityFilter === 'ALL' && !searchTerm.trim()) {
        console.log('📋 Mostrando todas las postulaciones sin filtros');
        setFilteredPostulations([...postulations]);
      } else {
        // Aplicar filtros normalmente
        applyFilters(postulations, statusFilter, validationFilter, priorityFilter, searchTerm, sortBy);
      }
    } else {
      console.log('⚠️ No hay postulaciones para filtrar');
      setFilteredPostulations([]);
    }
  }, [postulations, statusFilter, validationFilter, priorityFilter, searchTerm, sortBy]);`;

content = content.replace(oldFilterEffect, newFilterEffect);

fs.writeFileSync(filePath, content);
console.log('✅ Lógica de carga y filtros simplificada y corregida');
