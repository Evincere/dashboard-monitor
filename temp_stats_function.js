// Function to get document statistics
async function getDocumentStatistics() {
  try {
    // Get document statistics from backend
    const statsResponse = await backendClient.getDocumentStatistics();
    
    // Get users count for uniqueUsers calculation
    let uniqueUsers = 0;
    try {
      const usersResponse = await backendClient.getUsers({ size: 3000 });
      uniqueUsers = usersResponse.data?.totalElements || 0;
    } catch (error) {
      console.warn('Could not fetch users count for statistics:', error);
    }
    
    if (statsResponse.success && statsResponse.data) {
      return {
        totalDocuments: statsResponse.data.totalDocumentos || 0,
        uniqueUsers: uniqueUsers,
        totalSize: 0, // Will be calculated from documents when needed
        avgSize: 0, // Will be calculated from documents when needed  
        statusCounts: {
          pending: statsResponse.data.pendientes || 0,
          approved: statsResponse.data.aprobados || 0,
          rejected: statsResponse.data.rechazados || 0
        }
      };
    }
  } catch (error) {
    console.error('Error getting document statistics:', error);
  }
  
  // Fallback statistics
  return {
    totalDocuments: 0,
    uniqueUsers: 0,
    totalSize: 0,
    avgSize: 0,
    statusCounts: {
      pending: 0,
      approved: 0,
      rejected: 0
    }
  };
}
