# Documentos Huérfanos - Desincronización BD vs Sistema de Archivos

## Problema
Al intentar visualizar documentos de postulantes aparece el error JSON:
```json
{
  "error": "Document file not found",
  "message": "The document exists in the database but the file could not be accessed",
  "document": {
    "id": "cd4a1392-f52f-4cf2-9a60-b124d84e2c9a",
    "fileName": "Título Universitario y Certificado Analítico.pdf",
    "filePath": "34642267/Título Universitario y Certificado Analítico.pdf",
    "searchPaths": [
      "/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/documents",
      "/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/recovered_documents",
      "/var/lib/docker/volumes/mpd_concursos_backup_data_prod/_data"
    ],
    "userDni": "34642267"
  }
}
```

## Causa Raíz
**Desincronización entre Base de Datos y Sistema de Archivos:**

1. ✅ **Base de Datos**: Contiene registro del documento con ID `cd4a1392-f52f-4cf2-9a60-b124d84e2c9a`
2. ❌ **Sistema de Archivos**: El archivo físico no existe en ninguna ubicación
3. 🔍 **Análisis**: El documento nunca se guardó correctamente o se corrompió/eliminó posteriormente

### Caso Específico - Usuario DNI 34642267 (FRANCISCO SAMUEL BERNUES)

**Documentos Presentes en FileSystem:**
```bash
/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/documents/34642267/
├── 022759d9-d709-4e37-8f26-388d40619919_Certificado_de_Antig_edad_Profesional_1754601307363.pdf ✅
├── 712f231b-ab65-4ad3-9d93-40b94c71e7fa_Certificado_Sin_Sanciones_Disciplinarias_1754601356758.pdf ✅
├── 7ea55c10-0d3f-4057-98f0-ab4da5710535_Certificado_de_Antecedentes_Penales_1754492683998.pdf ✅
└── e508c7a6-055f-4d10-9e63-177236401201_Documento_Adicional_1754601601340.pdf ✅
```

**Documento Faltante en FileSystem:**
- ❌ `cd4a1392-f52f-4cf2-9a60-b124d84e2c9a_Título Universitario y Certificado Analítico.pdf`

## Síntomas
- ✅ La aplicación carga normalmente
- ✅ Se puede navegar entre postulantes
- ❌ Error al intentar visualizar documentos específicos
- ❌ Aparece mensaje JSON con error "Document file not found"
- ❌ El visualizador no puede mostrar el archivo

## Impacto en Postulaciones

### Estado de la Postulación
- 🟡 **PENDING**: La postulación queda en estado pendiente
- 📋 **Documentación Incompleta**: Falta documentación obligatoria
- ⚖️ **No Imputable al Usuario**: El error no es responsabilidad del postulante
- 🔄 **Requiere Acción**: El usuario debe re-subir la documentación faltante

### Proceso Administrativo
1. **Detección**: El sector administrativo identifica casos de documentos faltantes
2. **Reportes**: El sistema genera reportes de postulaciones en estado PENDING
3. **Notificación**: Se contacta al usuario para que regularice la situación  
4. **Re-subida**: El usuario debe cargar nuevamente el documento faltante
5. **Validación**: Una vez cargado, la postulación puede continuar su procesamiento

## Análisis Técnico

### Ubicaciones de Búsqueda del Endpoint
El endpoint `/api/documents/[id]/view/route.ts` busca archivos en:
1. `/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/documents`
2. `/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/recovered_documents`  
3. `/var/lib/docker/volumes/mpd_concursos_backup_data_prod/_data`

### Algoritmo de Búsqueda
```typescript
// 1. Búsqueda por ruta directa
const directPath = path.join(basePath, filePath);

// 2. Búsqueda por patrón de ID
const matchingFile = files.find(file => file.startsWith(id));
```

### Posibles Causas
- **Error en Upload**: El archivo nunca se guardó durante la subida inicial
- **Corrupción**: El archivo se corrompió y fue eliminado automáticamente
- **Migración Fallida**: Error durante procesos de migración/recuperación de datos
- **Eliminación Accidental**: El archivo fue eliminado por procesos de limpieza
- **Problema de Permisos**: Error de escritura durante la subida original

## Solución de Identificación Automática

### 1. Script de Detección de Documentos Huérfanos
```bash
#!/bin/bash
# check-orphaned-documents.sh

echo "🔍 Detectando documentos huérfanos..."

# Consultar documentos en BD y verificar existencia física
find /var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/documents -type d -name "[0-9]*" | while read userDir; do
    dni=$(basename "$userDir")
    echo "👤 Verificando usuario DNI: $dni"
    
    # Lista archivos esperados vs encontrados
    # (requiere query a BD para obtener lista completa)
done
```

### 2. Endpoint de Diagnóstico
Crear endpoint `/api/documents/diagnostics` que:
- Liste todos los documentos en BD por usuario
- Verifique existencia física de cada archivo  
- Genere reporte de archivos faltantes
- Identifique postulaciones afectadas

### 3. Dashboard de Monitoreo
- 📊 **Panel de Control**: Mostrar estadísticas de documentos huérfanos
- 🚨 **Alertas**: Notificaciones de nuevos casos detectados
- 📈 **Tendencias**: Tracking de casos resueltos vs pendientes
- 📋 **Reportes**: Export de usuarios afectados para contacto administrativo

## Mejoras al Sistema

### Prevención
1. **Validación Post-Upload**: Verificar que el archivo se guardó correctamente
2. **Checksums**: Implementar verificación de integridad de archivos
3. **Backup Automático**: Copia de seguridad inmediata post-upload
4. **Retry Logic**: Reintentar subida en caso de fallas
5. **Logging Detallado**: Registrar todos los steps del proceso de upload

### Detección Temprana  
1. **Health Checks**: Verificación periódica de integridad de documentos
2. **Alertas Automáticas**: Notificar inmediatamente casos de desincronización
3. **Reconciliación BD-FS**: Proceso batch para identificar inconsistencias

### Recuperación
1. **Proceso de Re-subida Simplificado**: UX optimizado para casos de re-carga
2. **Historial de Uploads**: Tracking de intentos de subida por documento
3. **Notificaciones Proactivas**: Alertar a usuarios sobre documentos faltantes

## Casos Similares Anteriores
- **Usuario**: Sergio Pereyra  
- **Problema**: Rutas mal configuradas
- **Solución**: Corrección de configuración de rutas de búsqueda

## Archivos Relevantes
- `./src/app/api/documents/[id]/view/route.ts` - Endpoint de visualización
- `./src/lib/backend-client.ts` - Cliente para consultas a BD
- `/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/` - Storage principal

## Próximos Pasos

### Inmediato
1. ✅ **Documentar el problema** (COMPLETADO)
2. 🔄 **Crear script de diagnóstico** para identificar más casos
3. 📊 **Generar reporte** de todos los usuarios afectados
4. 📞 **Notificar al área administrativa** para contacto con usuarios

### Mediano Plazo  
1. **Implementar dashboard** de monitoreo de documentos huérfanos
2. **Crear proceso automatizado** de detección y notificación
3. **Optimizar UX** para casos de re-subida de documentos
4. **Implementar mejoras de prevención** en el proceso de upload

### Largo Plazo
1. **Refactorizar sistema de storage** para mayor resiliencia
2. **Implementar checksums** y validación de integridad
3. **Crear sistema de backup** en tiempo real
4. **Monitoreo proactivo** con alertas automáticas

---
**Fecha de identificación:** 2025-08-22  
**Usuario afectado:** DNI 34642267 (FRANCISCO SAMUEL BERNUES)  
**Documento faltante:** Título Universitario y Certificado Analítico  
**Estado de postulación:** PENDING (requiere re-subida de documento)  
**Acción requerida:** Contacto administrativo con usuario para regularización
