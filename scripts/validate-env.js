#!/usr/bin/env node

/**
 * Script para validar variables de entorno requeridas en producción
 */

// Cargar variables de entorno desde .env
require('dotenv').config();

const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_URL'
];

const optionalEnvVars = [
    'JWT_EXPIRES_IN',
    'REFRESH_TOKEN_EXPIRES_IN',
    'BCRYPT_SALT_ROUNDS',
    'NODE_ENV',
    'PORT'
];

console.log('🔍 Validando variables de entorno...\n');

let hasErrors = false;

// Verificar variables requeridas
console.log('Variables requeridas:');
requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
        console.log(`❌ ${varName}: NO CONFIGURADA`);
        hasErrors = true;
    } else {
        // Ocultar valores sensibles
        const displayValue = varName.includes('SECRET') || varName.includes('PASSWORD') 
            ? '***CONFIGURADA***' 
            : value;
        console.log(`✅ ${varName}: ${displayValue}`);
    }
});

console.log('\nVariables opcionales:');
optionalEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: ${value}`);
    } else {
        console.log(`⚠️  ${varName}: usando valor por defecto`);
    }
});

// Validaciones específicas
console.log('\n🔒 Validaciones de seguridad:');

// Validar longitud de JWT_SECRET
const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret && jwtSecret.length < 32) {
    console.log('❌ JWT_SECRET debe tener al menos 32 caracteres');
    hasErrors = true;
} else if (jwtSecret) {
    console.log('✅ JWT_SECRET tiene longitud adecuada');
}

// Validar NODE_ENV
const nodeEnv = process.env.NODE_ENV;
if (nodeEnv === 'production') {
    console.log('✅ NODE_ENV configurado para producción');
} else {
    console.log(`⚠️  NODE_ENV: ${nodeEnv || 'no configurado'} (recomendado: production)`);
}

console.log('\n' + '='.repeat(50));

if (hasErrors) {
    console.log('❌ Hay errores en la configuración de variables de entorno');
    console.log('📝 Revisa el archivo .env.example para ver las variables requeridas');
    process.exit(1);
} else {
    console.log('✅ Todas las variables de entorno están correctamente configuradas');
    process.exit(0);
}