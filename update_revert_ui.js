const fs = require('fs');

// Leer el archivo actual
const filePath = 'src/app/(dashboard)/validation/[dni]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Reemplazar la función revertPostulationState para usar nuestro endpoint
const oldRevertFunction = `  // Función para revertir estado de postulación
  const revertPostulationState = async () => {
    if (!postulant?.inscription?.id) return;
    try {
      const response = await fetch(\`\${apiUrl}/api/admin/inscriptions/\${postulant.inscription.id}/state\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newState: 'PENDING', note: 'Reversión administrativa' })
      });
      if (!response.ok) throw new Error('Failed to revert');
      toast({ title: 'Estado Revertido', description: 'Postulación revertida a pendiente' });
      await fetchPostulantData();
    } catch (error) {
      toast({ title: 'Error', description: 'Error al revertir', variant: 'destructive' });
    }
  };`;

const newRevertFunction = `  // Función para revertir estado de postulación
  const revertPostulationState = async () => {
    if (!postulant?.user?.dni) return;
    try {
      const response = await fetch(\`/dashboard-monitor/api/postulations/\${postulant.user.dni}/revert\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          revertedBy: 'admin', // TODO: obtener usuario actual
          reason: 'Reversión administrativa para nueva evaluación'
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to revert');
      }
      
      toast({ 
        title: 'Estado Revertido', 
        description: \`Postulación revertida de \${result.data.inscription.previousState} a PENDING\`
      });
      await fetchPostulantData();
    } catch (error) {
      console.error('Error reverting postulation:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Error al revertir', 
        variant: 'destructive' 
      });
    }
  };`;

// Reemplazar la función
content = content.replace(oldRevertFunction, newRevertFunction);

// Actualizar la condición del botón para incluir COMPLETED
const oldButtonCondition = `{(postulant.inscription.state === 'APPROVED' || postulant.inscription.state === 'REJECTED') && (`;
const newButtonCondition = `{(postulant.inscription.state === 'APPROVED' || postulant.inscription.state === 'REJECTED' || postulant.inscription.state === 'COMPLETED') && (`;

content = content.replace(oldButtonCondition, newButtonCondition);

// Escribir el archivo modificado
fs.writeFileSync(filePath, content);

console.log('✅ UI de reversión actualizada para usar endpoint del microservicio y soportar COMPLETED');
