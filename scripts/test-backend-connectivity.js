#!/usr/bin/env node

/**
 * Script para probar la conectividad con el backend Spring Boot
 * Verifica si el backend está disponible y responde correctamente
 */

const https = require('https');
const http = require('http');

async function testBackendConnectivity() {
  const backendUrl = 'http://localhost:8080/api';
  
  console.log('🔍 Testing backend connectivity...');
  console.log(`📡 Target URL: ${backendUrl}`);
  
  // Test basic connection
  try {
    const testUrl = `${backendUrl}/admin/documentos/estadisticas`;
    console.log(`🎯 Testing endpoint: ${testUrl}`);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer dummy-token-for-test`
      }
    });
    
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log(`📊 Response body: ${responseText}`);
    
    if (response.ok) {
      console.log('✅ Backend is available and responding');
      return true;
    } else {
      console.log(`⚠️ Backend returned error status: ${response.status}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Backend connection failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Possible solutions:');
      console.log('   1. Start the Spring Boot backend server');
      console.log('   2. Verify the backend is running on port 8080');
      console.log('   3. Check firewall settings');
    }
    
    return false;
  }
}

async function testEndpoints() {
  const endpoints = [
    '/admin/documentos/estadisticas',
    '/admin/documentos',
    '/users',
    '/inscriptions'
  ];
  
  console.log('\n🧪 Testing individual endpoints...');
  
  for (const endpoint of endpoints) {
    const url = `http://localhost:8080/api${endpoint}`;
    try {
      console.log(`\n🔍 Testing: ${endpoint}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer dummy-token'
        }
      });
      
      console.log(`   Status: ${response.status}`);
      if (response.ok) {
        console.log('   ✅ OK');
      } else {
        console.log(`   ⚠️ Error: ${response.statusText}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🚀 Backend Connectivity Test');
  console.log('============================\n');
  
  const isAvailable = await testBackendConnectivity();
  
  if (isAvailable) {
    await testEndpoints();
  } else {
    console.log('\n💡 To start the backend, run:');
    console.log('   cd B:\\CODE\\PROYECTOS\\concursos-mpd');
    console.log('   .\\start-backend-local.ps1');
    console.log('\nOr manually:');
    console.log('   $env:DOCUMENTS_BASE_PATH = "B:/concursos_situacion_post_gracia/descarga_administracion_20250814_191745"');
    console.log('   $env:SPRING_PROFILES_ACTIVE = "local"');
    console.log('   cd concurso-backend');
    console.log('   mvn spring-boot:run');
  }
  
  console.log('\n🏁 Test completed');
}

main().catch(console.error);
