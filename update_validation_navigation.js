const fs = require('fs');

// Leer el archivo actual
const filePath = 'src/app/(dashboard)/validation/[dni]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Agregar función para buscar siguiente postulación
const navigationFunction = `
  // Función para navegar a la siguiente postulación automáticamente
  const navigateToNextPostulation = async (currentDni: string) => {
    try {
      console.log('🔍 Buscando siguiente postulación después de procesar:', currentDni);
      
      const response = await fetch(\`/dashboard-monitor/api/validation/next-postulation?currentDni=\${currentDni}\`, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (response.ok && result.success && result.data?.nextPostulation) {
        const nextDni = result.data.nextPostulation.dni;
        const nextName = result.data.nextPostulation.fullName;
        
        console.log(\`✅ Siguiente postulación encontrada: \${nextName} (DNI: \${nextDni})\`);
        
        toast({
          title: 'Navegando a siguiente postulación',
          description: \`Cargando documentos de \${nextName}\`,
          duration: 2000
        });
        
        // Navegar a la siguiente postulación
        router.push(\`/validation/\${nextDni}\`);
        return true;
      } else {
        console.log('ℹ️ No se encontraron más postulaciones para validar');
        
        toast({
          title: 'Validación completada',
          description: 'No hay más postulaciones disponibles para validar en este momento',
          duration: 3000
        });
        
        // Regresar al listado
        router.push('/validation');
        return false;
      }
    } catch (error) {
      console.error('❌ Error al buscar siguiente postulación:', error);
      
      toast({
        title: 'Error de navegación',
        description: 'No se pudo cargar la siguiente postulación. Regresando al listado.',
        variant: 'destructive',
        duration: 3000
      });
      
      // En caso de error, regresar al listado
      router.push('/validation');
      return false;
    }
  };
`;

// Buscar donde insertar la función (antes de handleValidationDecision)
const insertBefore = '  const handleValidationDecision = async (decision: ValidationDecision) => {';
content = content.replace(insertBefore, navigationFunction + insertBefore);

// Modificar handleValidationDecision para incluir navegación automática
const oldHandleValidation = `      toast({
        title: \`Postulante \${decision.action === 'approve' ? 'Aprobado' : 'Rechazado'}\`,
        description: \`La decisión ha sido registrada exitosamente\`,
        variant: decision.action === 'approve' ? 'default' : 'destructive',
      });

      // Refresh data
      await fetchPostulantData();`;

const newHandleValidation = `      toast({
        title: \`Postulante \${decision.action === 'approve' ? 'Aprobado' : 'Rechazado'}\`,
        description: \`La decisión ha sido registrada exitosamente. Buscando siguiente postulación...\`,
        variant: decision.action === 'approve' ? 'default' : 'destructive',
      });

      // Navegar automáticamente a la siguiente postulación
      await navigateToNextPostulation(dni);`;

content = content.replace(oldHandleValidation, newHandleValidation);

// Escribir el archivo modificado
fs.writeFileSync(filePath, content);

console.log('✅ Navegación automática agregada a handleValidationDecision');
