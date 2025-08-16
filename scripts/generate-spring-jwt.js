#!/usr/bin/env node

/**
 * Script para generar token JWT compatible con Spring Boot Security
 * Sigue el formato estándar de Spring Security JWT
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = 'RcmUR2yePNGr5pjZ9bXL_dx7h_xeIliI4iS4ESXDMMs';

// Generar token compatible con Spring Boot
function generateSpringBootJWT() {
  const payload = {
    sub: 'dashboard-admin',
    iss: 'mpd-dashboard',
    aud: 'mpd-backend',
    // Spring Security típicamente usa estos campos
    username: 'dashboard-admin',
    authorities: 'ROLE_ADMIN',  // Como string, no array
    role: 'ROLE_ADMIN',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    header: {
      typ: 'JWT',
      alg: 'HS256'
    }
  });

  return { token, payload };
}

// Probar diferentes variaciones de payload
const variations = [
  // Variación 1: Spring Security estándar
  {
    sub: 'admin',
    username: 'admin',
    authorities: ['ROLE_ADMIN'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  },
  
  // Variación 2: Con issuer y audience
  {
    sub: 'admin',
    iss: 'dashboard-service',
    aud: 'mpd-backend',
    username: 'admin',
    authorities: ['ROLE_ADMIN'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  },
  
  // Variación 3: Minimal con authorities como string
  {
    sub: 'admin',
    authorities: 'ROLE_ADMIN',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  },

  // Variación 4: Con userId
  {
    sub: 'admin',
    userId: 'admin',
    username: 'admin',
    role: 'ROLE_ADMIN',
    authorities: ['ROLE_ADMIN'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  }
];

console.log('🔐 Generando tokens JWT compatibles con Spring Boot...\n');

variations.forEach((payload, index) => {
  const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
  
  console.log(`${index + 1}. Variación ${index + 1}:`);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('Token:', token);
  
  // Verificar el token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token válido');
  } catch (error) {
    console.log('❌ Token inválido:', error.message);
  }
  
  console.log('\n' + '-'.repeat(80) + '\n');
});

// Comando curl para probar
const testPayload = variations[0];  // Usar la primera variación
const testToken = jwt.sign(testPayload, JWT_SECRET, { algorithm: 'HS256' });

console.log('🧪 Comando para probar con curl:');
console.log(`curl -H "Authorization: Bearer ${testToken}" -H "Content-Type: application/json" http://localhost:8080/api/admin/users?size=5`);
console.log('\n');

console.log('📋 Para copiar el token:');
console.log(testToken);
