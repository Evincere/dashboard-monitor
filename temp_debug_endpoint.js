// Test script to debug the backend-client issue
const backendClient = require('./src/lib/backend-client.ts').default;

async function test() {
  console.log('🔧 Testing backend client...');
  
  try {
    console.log('1. Testing connection...');
    const testResult = await backendClient.testConnection();
    console.log('Test connection result:', testResult);
    
    console.log('2. Testing users fetch...');
    const usersResult = await backendClient.getUsers({ page: 0, size: 3 });
    console.log('Users result:', usersResult);
    
    console.log('3. Testing inscriptions fetch...');
    const inscriptionsResult = await backendClient.getInscriptions({ size: 10 });
    console.log('Inscriptions result:', inscriptionsResult);
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

test();
