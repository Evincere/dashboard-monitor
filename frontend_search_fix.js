const fs = require('fs');

// Leer el archivo
const content = fs.readFileSync('src/app/(dashboard)/postulations/page.tsx', 'utf8');

// Modificar la función fetchPostulations para incluir search como parámetro
const searchParamFix = content.replace(
  /const params = new URLSearchParams\(\{\s*page: page\.toString\(\),\s*pageSize: pageSize\.toString\(\)\s*\}\);/,
  `const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });
      
      // Agregar parámetro de búsqueda si existe
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }`
);

// Modificar el useEffect para que relance la búsqueda cuando cambie searchTerm
const useEffectFix = searchParamFix.replace(
  /\/\/ Handle filter changes\s*useEffect\(\(\) => \{\s*if \(postulations\.length > 0\) \{\s*applyFilters\(postulations, statusFilter, validationFilter, priorityFilter, searchTerm, sortBy\);\s*\}\s*\}, \[postulations, statusFilter, validationFilter, priorityFilter, searchTerm, sortBy\]\);/,
  `// Handle filter changes
  useEffect(() => {
    if (postulations.length > 0) {
      // Si hay término de búsqueda, hacer nueva petición al backend
      if (searchTerm.trim()) {
        // Reset to page 1 and fetch with search
        setCurrentPage(1);
        setPostulations([]);
        fetchPostulations(1, false);
      } else {
        // Si no hay búsqueda, aplicar filtros localmente
        applyFilters(postulations, statusFilter, validationFilter, priorityFilter, searchTerm, sortBy);
      }
    }
  }, [statusFilter, validationFilter, priorityFilter, sortBy]);
  
  // Handle search term separately with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim() || (!searchTerm.trim() && postulations.length === 0)) {
        setCurrentPage(1);
        setPostulations([]);
        fetchPostulations(1, false);
      } else {
        // Clear search, apply local filters
        applyFilters(postulations, statusFilter, validationFilter, priorityFilter, '', sortBy);
      }
    }, 500); // Debounce de 500ms
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);`
);

// Modificar la función fetchPostulations para aceptar searchTerm
const fetchFunctionFix = useEffectFix.replace(
  /const fetchPostulations = async \(page = 1, append = false\) => \{/,
  `const fetchPostulations = async (page = 1, append = false, currentSearch = searchTerm) => {`
);

// Actualizar las referencias internas de searchTerm en fetchPostulations
const internalSearchFix = fetchFunctionFix.replace(
  /if \(searchTerm\.trim\(\)\) \{\s*params\.append\('search', searchTerm\.trim\(\)\);\s*\}/,
  `if (currentSearch.trim()) {
        params.append('search', currentSearch.trim());
      }`
);

// Escribir el archivo arreglado
fs.writeFileSync('src/app/(dashboard)/postulations/page.tsx', internalSearchFix);
console.log('✅ Updated frontend to send search queries to backend');
