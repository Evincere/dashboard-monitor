#!/usr/bin/env node

/**
 * Script para probar la conectividad con el backend Spring Boot
 * y verificar la autenticación JWT
 */

const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Configuración
const BACKEND_API_URL = 'http://localhost:8080/api';
const JWT_SECRET = 'RcmUR2yePNGr5pjZ9bXL_dx7h_xeIliI4iS4ESXDMMs';

// Función para generar token JWT
function generateAdminToken() {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload = {
    sub: 'admin',
    authorities: ['ROLE_ADMIN', 'ROLE_USER'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64url');

  return `${base64Header}.${base64Payload}.${signature}`;
}

// Función para probar un endpoint
async function testEndpoint(endpoint, description) {
  console.log(`\n🔍 Probando: ${description}`);
  console.log(`URL: ${BACKEND_API_URL}${endpoint}`);
  
  const token = generateAdminToken();
  console.log(`Token generado: ${token.substring(0, 50)}...`);
  
  try {
    const response = await fetch(`${BACKEND_API_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Éxito!');
      console.log('Datos recibidos:', JSON.stringify(data, null, 2).substring(0, 300) + '...');
      return { success: true, data };
    } else {
      const errorText = await response.text();
      console.log('❌ Error!');
      console.log('Response:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.log('🔥 Excepción!');
    console.log('Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando pruebas de conectividad con el backend...\n');
  console.log(`Backend URL: ${BACKEND_API_URL}`);
  console.log(`JWT Secret: ${JWT_SECRET.substring(0, 20)}...`);
  
  // Lista de endpoints a probar
  const endpoints = [
    { url: '/admin/documentos/estadisticas', desc: 'Estadísticas de documentos' },
    { url: '/admin/users?size=5', desc: 'Lista de usuarios (5 primeros)' },
    { url: '/admin/inscriptions?size=5', desc: 'Lista de inscripciones (5 primeras)' },
    { url: '/admin/documentos?size=5', desc: 'Lista de documentos (5 primeros)' }
  ];

  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.url, endpoint.desc);
    results.push({ ...endpoint, result });
  }
  
  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS:');
  console.log('='.repeat(60));
  
  results.forEach(({ desc, result }) => {
    const status = result.success ? '✅ ÉXITO' : '❌ ERROR';
    console.log(`${status} - ${desc}`);
    if (!result.success) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.result.success).length;
  console.log(`\n📈 Resultado: ${successCount}/${results.length} pruebas exitosas`);
  
  if (successCount === results.length) {
    console.log('🎉 ¡Todas las pruebas pasaron! La conectividad con el backend funciona correctamente.');
  } else {
    console.log('⚠️  Algunas pruebas fallaron. Revisa la configuración del backend.');
  }
}

// Ejecutar pruebas
main().catch(error => {
  console.error('💥 Error crítico:', error);
  process.exit(1);
});
