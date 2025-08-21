const fs = require('fs');
const filePath = 'src/app/api/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the statistics function to be more robust
const robustStatistics = `async function getDocumentStatistics() {
  try {
    const statsResponse = await backendClient.getDocumentStatistics();
    if (statsResponse.success && statsResponse.data) {
      const data = statsResponse.data;
      return {
        totalDocuments: data.totalDocumentos || data.totalDocuments || 0,
        uniqueUsers: data.totalUsuarios || data.totalUsuariosUnicos || data.uniqueUsers || 0,
        totalSize: 0,
        avgSize: 0,
        statusCounts: {
          pending: data.pendientes || data.pending || 0,
          approved: data.aprobados || data.approved || 0,
          rejected: data.rechazados || data.rejected || 0
        }
      };
    }
  } catch (error) {
    console.error('Error fetching statistics:', error);
  }
  
  return {
    totalDocuments: 0,
    uniqueUsers: 0,
    totalSize: 0,
    avgSize: 0,
    statusCounts: { pending: 0, approved: 0, rejected: 0 }
  };
}`;

// Replace the entire statistics function
content = content.replace(
  /async function getDocumentStatistics\(\) \{[\s\S]*?\n}/,
  robustStatistics
);

fs.writeFileSync(filePath, content);
console.log('✅ Statistics function made robust');
