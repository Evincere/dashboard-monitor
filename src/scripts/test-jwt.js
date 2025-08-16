const jwt = require('jsonwebtoken');

// JWT Secret del backend Spring Boot
const JWT_SECRET = 'RcmUR2yePNGr5pjZ9bXL_dx7h_xeIliI4iS4ESXDMMs';

// Función para generar token JWT
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '1h',
    algorithm: 'HS256'
  });
}

// Función para verificar token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Error verifying token:', error.message);
    return null;
  }
}

// Probar diferentes formatos de payload
console.log('🔐 Testing JWT Token Generation...\n');

// Opción 1: Payload básico de servicio
const servicePayload = {
  sub: 'dashboard-service',
  role: 'ROLE_ADMIN',
  iat: Math.floor(Date.now() / 1000)
};

const serviceToken = generateToken(servicePayload);
console.log('1. Service Token:');
console.log('Payload:', JSON.stringify(servicePayload, null, 2));
console.log('Token:', serviceToken);
console.log('Verified:', verifyToken(serviceToken) ? '✅ Valid' : '❌ Invalid');
console.log();

// Opción 2: Payload simulando usuario admin
const adminPayload = {
  sub: 'admin',
  username: 'admin',
  role: 'ROLE_ADMIN',
  authorities: ['ROLE_ADMIN'],
  iat: Math.floor(Date.now() / 1000)
};

const adminToken = generateToken(adminPayload);
console.log('2. Admin Token:');
console.log('Payload:', JSON.stringify(adminPayload, null, 2));
console.log('Token:', adminToken);
console.log('Verified:', verifyToken(adminToken) ? '✅ Valid' : '❌ Invalid');
console.log();

// Opción 3: Payload mínimo
const minimalPayload = {
  sub: 'admin',
  role: 'ADMIN'
};

const minimalToken = generateToken(minimalPayload);
console.log('3. Minimal Token:');
console.log('Payload:', JSON.stringify(minimalPayload, null, 2));
console.log('Token:', minimalToken);
console.log('Verified:', verifyToken(minimalToken) ? '✅ Valid' : '❌ Invalid');
console.log();

// Test directo con curl
console.log('🧪 Test Commands:');
console.log('curl -H "Authorization: Bearer ' + serviceToken + '" http://localhost:8080/api/admin/documentos/estadisticas');
console.log();
console.log('curl -H "Authorization: Bearer ' + adminToken + '" http://localhost:8080/api/admin/documentos/estadisticas');
console.log();
console.log('curl -H "Authorization: Bearer ' + minimalToken + '" http://localhost:8080/api/admin/documentos/estadisticas');
