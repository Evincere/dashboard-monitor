const fs = require('fs');

// Leer el archivo actual
const filePath = 'src/app/(dashboard)/validation/[dni]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Agregar la función de reversión de postulación después de submitDecision
const insertAfter = 'const submitDecision = async () => {';
const submitDecisionEndIndex = content.indexOf('  };', content.indexOf(insertAfter));

const revertPostulationFunction = `

  // Función para revertir estado de postulación
  const revertPostulationState = async () => {
    if (!postulant?.inscription?.id) return;
    
    try {
      console.log('🔄 Revirtiendo estado de postulación:', postulant.inscription.id);
      
      const response = await fetch(\`\${apiUrl}/api/admin/inscriptions/\${postulant.inscription.id}/state\`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newState: 'PENDING',
          note: 'Reversión de estado para re-evaluación administrativa'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revert postulation state');
      }

      toast({
        title: "Estado Revertido",
        description: "La postulación ha sido revertida a estado pendiente",
        variant: "default",
      });

      // Refresh data
      await fetchPostulantData();
      
    } catch (error) {
      console.error('Error reverting postulation state:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al revertir el estado',
        variant: 'destructive',
      });
    }
  };`;

// Insertar la función después de submitDecision
content = content.slice(0, submitDecisionEndIndex + 4) + revertPostulationFunction + content.slice(submitDecisionEndIndex + 4);

// Ahora agregar el botón junto al badge
const badgeSection = `              <Badge variant="outline">
                Estado: {postulant.inscription.state}
              </Badge>`;

const badgeWithButton = `              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">
                  Estado: {postulant.inscription.state}
                </Badge>
                {(postulant.inscription.state === 'APPROVED' || postulant.inscription.state === 'REJECTED') && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <RefreshCw className="w-4 h-4" />
                        Revertir Estado
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Revertir Estado de Postulación?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción revertirá el estado de la postulación de "{postulant.inscription.state}" a "PENDING", 
                          permitiendo una nueva evaluación administrativa. Esta acción se registrará en el historial.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={revertPostulationState}>
                          Confirmar Reversión
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>`;

// Reemplazar el badge con la nueva sección
content = content.replace(badgeSection, badgeWithButton);

// Escribir el archivo modificado
fs.writeFileSync(filePath, content);

console.log('✅ Botón de reversión de postulación agregado exitosamente');
