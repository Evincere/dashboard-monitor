// Script para corregir la función de revertir documentos
const fs = require('fs');

const filePath = 'src/app/(dashboard)/postulations/[dni]/documents/validation/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Reemplazar la función handleRevertStatus completa
const oldFunction = /\/\/ Handle revert document status[\s\S]*?const handleRevertStatus = \(\) => \{[\s\S]*?updateStats\(\);\s*\n\s*};/;

const newFunction = `// Handle revert document status
  const handleRevertStatus = async () => {
    if (!currentDocument) return;

    try {
      console.log('🔄 Reverting document status:', currentDocument.id);
      
      // Call backend API to revert document
      const response = await fetch('/dashboard-monitor/api/documents/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: currentDocument.id,
          revertedBy: 'admin', // TODO: Get from auth context
          reason: 'Status reverted to pending for re-evaluation'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to revert document status');
      }

      const result = await response.json();
      console.log('✅ Document reverted successfully:', result);

      // Update local state after successful backend call
      const updatedDocuments = documents.map(doc =>
        doc.id === currentDocument.id
          ? {
              ...doc,
              validationStatus: 'PENDING' as const,
              validatedAt: undefined,
              validatedBy: undefined,
              comments: undefined,
              rejectionReason: undefined
            }
          : doc
      );
      
      // Update store and current document immediately
      setDocuments(updatedDocuments);
      
      // Find and set the updated current document to trigger re-render
      const updatedCurrentDocument = updatedDocuments.find(doc => doc.id === currentDocument.id);
      if (updatedCurrentDocument) {
        setCurrentDocument(updatedCurrentDocument);
      }
      
      updateStats();

      toast({
        title: "Estado Revertido",
        description: "El documento ha sido revertido a estado pendiente.",
      });

    } catch (error) {
      console.error('❌ Error reverting document:', error);
      toast({
        title: "Error",
        description: "No se pudo revertir el estado del documento.",
        variant: "destructive",
      });
    }
  };`;

content = content.replace(oldFunction, newFunction);

fs.writeFileSync(filePath, content);
console.log('✅ Función handleRevertStatus actualizada para persistir cambios');
