#!/usr/bin/env node

/**
 * Script para generar JWT token usando la misma lógica que backend-client.ts
 */

const crypto = require('crypto');

const JWT_SECRET = process.env.BACKEND_JWT_SECRET || 'RcmUR2yePNGr5pjZ9bXL_dx7h_xeIliI4iS4ESXDMMs';

function generateServiceToken() {
  try {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const payload = {
      sub: 'admin',
      username: 'admin',
      authorities: ['ROLE_ADMIN'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    };

    const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${base64Header}.${base64Payload}`)
      .digest('base64url');

    return `${base64Header}.${base64Payload}.${signature}`;
  } catch (error) {
    console.error('Error generando JWT:', error);
    process.exit(1);
  }
}

const token = generateServiceToken();
console.log('Generated JWT Token:');
console.log(token);
console.log('');
console.log('Export as environment variable:');
console.log(`export JWT_TOKEN="${token}"`);
console.log('');
console.log('For PowerShell:');
console.log(`$env:JWT_TOKEN="${token}"`);
