const fs = require('fs');

// Leer el archivo actual
const filePath = 'src/app/(dashboard)/validation/[dni]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Agregar función para manejar "aprobar y continuar"
const approveAndContinueFunction = `
  // Función para aprobar y continuar automáticamente
  const handleApproveAndContinue = async () => {
    await handleValidationDecision({
      action: 'approve',
      comments: validationComments,
      documentDecisions: documentComments
    });
  };

  // Función para rechazar y continuar automáticamente  
  const handleRejectAndContinue = async () => {
    await handleValidationDecision({
      action: 'reject',
      comments: validationComments,
      documentDecisions: documentComments
    });
  };
`;

// Insertar las funciones antes de return
const insertBefore = '  if (loading) {';
content = content.replace(insertBefore, approveAndContinueFunction + insertBefore);

// Actualizar el modal de aprobación para incluir botón de continuar
const oldApprovalFooter = `                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleValidationDecision({
                          action: 'approve',
                          comments: validationComments,
                          documentDecisions: documentComments
                        })}
                      >
                        Aprobar
                      </AlertDialogAction>
                    </AlertDialogFooter>`;

const newApprovalFooter = `                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <div className="flex gap-2">
                        <AlertDialogAction 
                          variant="outline"
                          onClick={() => handleValidationDecision({
                            action: 'approve',
                            comments: validationComments,
                            documentDecisions: documentComments
                          })}
                        >
                          Solo Aprobar
                        </AlertDialogAction>
                        <AlertDialogAction 
                          onClick={handleApproveAndContinue}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Aprobar y Continuar →
                        </AlertDialogAction>
                      </div>
                    </AlertDialogFooter>`;

content = content.replace(oldApprovalFooter, newApprovalFooter);

// Actualizar el modal de rechazo para incluir botón de continuar
const oldRejectionFooter = `                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        variant="destructive"
                        onClick={() => handleValidationDecision({
                          action: 'reject',
                          comments: validationComments,
                          documentDecisions: documentComments
                        })}
                      >
                        Rechazar
                      </AlertDialogAction>
                    </AlertDialogFooter>`;

const newRejectionFooter = `                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <div className="flex gap-2">
                        <AlertDialogAction 
                          variant="outline"
                          onClick={() => handleValidationDecision({
                            action: 'reject',
                            comments: validationComments,
                            documentDecisions: documentComments
                          })}
                        >
                          Solo Rechazar
                        </AlertDialogAction>
                        <AlertDialogAction 
                          variant="destructive"
                          onClick={handleRejectAndContinue}
                        >
                          Rechazar y Continuar →
                        </AlertDialogAction>
                      </div>
                    </AlertDialogFooter>`;

content = content.replace(oldRejectionFooter, newRejectionFooter);

// Escribir el archivo modificado
fs.writeFileSync(filePath, content);

console.log('✅ Botones "Continuar" agregados a los modales de confirmación');
