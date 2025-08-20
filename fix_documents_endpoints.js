// Script para corregir los endpoints de documentos para usar backendClient real
const fs = require('fs');

// Fix approve endpoint
const approveFile = 'src/app/api/documents/approve/route.ts';
let approveContent = fs.readFileSync(approveFile, 'utf8');

// Reemplazar la lógica de aprobación para usar backendClient como primera opción
approveContent = approveContent.replace(
  /\/\/ Check if backend integration is enabled[\s\S]*?\/\/ Fall back to mock response instead of failing[\s\S]*?console\.warn\('Backend approval failed, using mock response:', error\);[\s\S]*?}/,
  `// Always try to use backend integration first
    try {
      console.log('🔗 Using real backend client for document approval');
      const approvalResponse = await backendClient.approveDocument(documentId);

      if (approvalResponse.success) {
        console.log(\`✅ Document \${documentId} approved successfully via REAL backend\`);
        return NextResponse.json({
          success: true,
          message: 'Document approved successfully',
          data: {
            documentId,
            validatedBy,
            comments: comments || undefined,
            approvedDocument: approvalResponse.data
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('❌ Real backend approval failed:', approvalResponse.error);
        throw new Error(approvalResponse.error || 'Backend approval failed');
      }
    } catch (error) {
      console.error('❌ Backend approval error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to approve document in backend',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }`
);

fs.writeFileSync(approveFile, approveContent);
console.log('✅ Approve endpoint updated to use real backend');

// Fix reject endpoint  
const rejectFile = 'src/app/api/documents/reject/route.ts';
let rejectContent = fs.readFileSync(rejectFile, 'utf8');

rejectContent = rejectContent.replace(
  /\/\/ Check if backend integration is enabled[\s\S]*?\/\/ Fall back to mock response instead of failing[\s\S]*?console\.warn\('Backend rejection failed, using mock response:', error\);[\s\S]*?}/,
  `// Always try to use backend integration first
    try {
      console.log('🔗 Using real backend client for document rejection');
      const rejectionResponse = await backendClient.rejectDocument(documentId, reason);

      if (rejectionResponse.success) {
        console.log(\`❌ Document \${documentId} rejected successfully via REAL backend\`);
        return NextResponse.json({
          success: true,
          message: 'Document rejected successfully',
          data: {
            documentId,
            validatedBy,
            reason,
            rejectedDocument: rejectionResponse.data
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('❌ Real backend rejection failed:', rejectionResponse.error);
        throw new Error(rejectionResponse.error || 'Backend rejection failed');
      }
    } catch (error) {
      console.error('❌ Backend rejection error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to reject document in backend',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }`
);

fs.writeFileSync(rejectFile, rejectContent);
console.log('✅ Reject endpoint updated to use real backend');
