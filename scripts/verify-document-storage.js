#!/usr/bin/env node

/**
 * Script de verificación para diagnosticar problemas de almacenamiento de documentos
 * 
 * Uso: node scripts/verify-document-storage.js [document-id]
 */

const fs = require('fs').promises;
const path = require('path');

// Configuración
const CONFIG = {
  basePaths: [
    process.env.LOCAL_DOCUMENTS_PATH || 'B:\\concursos_situacion_post_gracia\\descarga_administracion_20250814_191745\\documentos',
    process.env.DOCUMENT_STORAGE_PATH || '/var/lib/docker/volumes/mpd_concursos_document_storage_prod/_data',
    path.join(process.cwd(), 'storage', 'documents'),
    '/app/storage/documents'
  ]
};

function log(icon, message, ...args) {
  console.log(`${icon} ${message}`, ...args);
}

function error(message, ...args) {
  console.error(`❌ ${message}`, ...args);
}

function success(message, ...args) {
  console.log(`✅ ${message}`, ...args);
}

function warning(message, ...args) {
  console.warn(`⚠️  ${message}`, ...args);
}

async function checkDirectory(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    if (stats.isDirectory()) {
      const files = await fs.readdir(dirPath);
      return {
        exists: true,
        isDirectory: true,
        fileCount: files.length,
        files: files.slice(0, 5), // Primeros 5 archivos como muestra
        permissions: stats.mode.toString(8).slice(-3)
      };
    } else {
      return {
        exists: true,
        isDirectory: false,
        error: 'Path exists but is not a directory'
      };
    }
  } catch (err) {
    return {
      exists: false,
      error: err.message
    };
  }
}

async function findDocumentFile(documentId, userDni) {
  const results = [];
  
  for (const basePath of CONFIG.basePaths) {
    const info = {
      basePath,
      found: false,
      files: []
    };
    
    try {
      // Verificar si el directorio base existe
      await fs.stat(basePath);
      
      if (userDni) {
        const userDir = path.join(basePath, userDni);
        try {
          const files = await fs.readdir(userDir);
          const matchingFiles = files.filter(file => 
            file.includes(documentId) || file.startsWith(documentId)
          );
          
          if (matchingFiles.length > 0) {
            info.found = true;
            info.files = matchingFiles;
            
            // Verificar cada archivo
            for (const file of matchingFiles) {
              const filePath = path.join(userDir, file);
              try {
                const stats = await fs.stat(filePath);
                info.files.push({
                  name: file,
                  path: filePath,
                  size: stats.size,
                  accessible: true
                });
              } catch (err) {
                info.files.push({
                  name: file,
                  path: filePath,
                  accessible: false,
                  error: err.message
                });
              }
            }
          }
        } catch (err) {
          info.error = `Cannot read user directory ${userDir}: ${err.message}`;
        }
      }
    } catch (err) {
      info.error = `Base path not accessible: ${err.message}`;
    }
    
    results.push(info);
  }
  
  return results;
}

async function verifyEnvironment() {
  log('🔍', 'Verificando configuración del entorno...\n');
  
  // Variables de entorno
  log('📋', 'Variables de entorno:');
  log('  ', `LOCAL_DOCUMENTS_PATH: ${process.env.LOCAL_DOCUMENTS_PATH || 'No configurada'}`);
  log('  ', `DOCUMENT_STORAGE_PATH: ${process.env.DOCUMENT_STORAGE_PATH || 'No configurada'}`);
  log('  ', `NODE_ENV: ${process.env.NODE_ENV || 'No configurada'}`);
  log('  ', `PWD: ${process.cwd()}`);
  console.log();
  
  // Verificar directorios base
  log('📁', 'Verificando directorios base:');
  for (const basePath of CONFIG.basePaths) {
    const result = await checkDirectory(basePath);
    
    if (result.exists && result.isDirectory) {
      success(`${basePath}`);
      log('  ', `  Archivos: ${result.fileCount}`);
      log('  ', `  Permisos: ${result.permissions}`);
      if (result.files.length > 0) {
        log('  ', `  Muestra: ${result.files.join(', ')}`);
      }
    } else if (result.exists && !result.isDirectory) {
      error(`${basePath} - ${result.error}`);
    } else {
      warning(`${basePath} - No existe`);
    }
    console.log();
  }
}

async function testDocumentAccess(documentId, userDni) {
  if (!documentId) {
    log('⚠️ ', 'No se proporcionó ID de documento. Solo verificando configuración general.');
    return;
  }
  
  log('🔎', `Buscando documento: ${documentId}`);
  if (userDni) {
    log('👤', `Usuario DNI: ${userDni}`);
  }
  console.log();
  
  const results = await findDocumentFile(documentId, userDni);
  
  let foundAny = false;
  
  for (const result of results) {
    if (result.found) {
      success(`Encontrado en: ${result.basePath}`);
      for (const file of result.files) {
        if (typeof file === 'string') {
          log('  ', `📄 ${file}`);
        } else {
          if (file.accessible) {
            success(`  📄 ${file.name} (${file.size} bytes)`);
          } else {
            error(`  📄 ${file.name} - ${file.error}`);
          }
        }
      }
      foundAny = true;
    } else if (result.error) {
      warning(`${result.basePath} - ${result.error}`);
    } else {
      log('  ', `${result.basePath} - Sin coincidencias`);
    }
  }
  
  if (!foundAny) {
    error(`Documento ${documentId} no encontrado en ninguna ubicación`);
    
    if (userDni) {
      log('🔧', 'Sugerencias:');
      log('  ', '1. Verificar que el DNI del usuario es correcto');
      log('  ', '2. Verificar que el archivo existe en el directorio del usuario');
      log('  ', '3. Verificar permisos de lectura en los directorios');
      log('  ', '4. Verificar que las variables de entorno están configuradas correctamente');
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const documentId = args[0];
  const userDni = args[1];
  
  console.log('='.repeat(60));
  console.log('🔍 VERIFICADOR DE ALMACENAMIENTO DE DOCUMENTOS');
  console.log('='.repeat(60));
  console.log();
  
  try {
    await verifyEnvironment();
    await testDocumentAccess(documentId, userDni);
    
    console.log();
    console.log('='.repeat(60));
    log('✨', 'Verificación completada');
    
    if (documentId) {
      console.log();
      log('💡', 'Para más información, consultar:');
      log('  ', '- Logs de la aplicación');
      log('  ', '- docs/DOCUMENT_STORAGE_CONFIGURATION.md');
    }
    
  } catch (error) {
    console.error();
    error('Error durante la verificación:', error.message);
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  verifyEnvironment,
  testDocumentAccess,
  checkDirectory,
  findDocumentFile
};
