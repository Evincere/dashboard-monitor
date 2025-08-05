# Análisis Detallado del Sistema de Almacenamiento de Documentos

## Resumen Ejecutivo

Este documento presenta el análisis completo del sistema de almacenamiento de documentos de la aplicación MPD Concursos, realizado como parte de la auditoría del dashboard-monitor. El análisis revela que el sistema utiliza una arquitectura de almacenamiento centralizada y bien estructurada, con documentos almacenados correctamente en el volumen `mpd_concursos_storage_data_prod`.

## Arquitectura de Almacenamiento Actual

### Configuración Principal

**Clase de Configuración:** `StorageConfig.java`
- **Ubicación:** `ar.gov.mpd.concursobackend.shared.config.StorageConfig`
- **Directorio Base:** `/app/storage` (en contenedor)
- **Volumen Docker:** `mpd_concursos_storage_data_prod`

### Estructura de Directorios

```
/app/storage/
├── documents/          # 157MB - 359 archivos (documentos de postulantes)
├── cv-documents/       # 18MB - documentos de CV
├── contest-bases/      # 15MB - bases de concursos (PDFs)
├── profile-images/     # 324KB - imágenes de perfil
├── contest-descriptions/ # 4KB - descripciones de concursos
└── temp/              # 4KB - archivos temporales
```

**Total de almacenamiento:** ~190MB

## Análisis por Tipo de Documento

### 1. Documentos de Postulantes (`/documents`)

**Características:**
- **Cantidad:** 359 archivos
- **Tamaño:** 157MB
- **Estructura:** Organizado por DNI de usuario
- **Nomenclatura:** `{id_documento}_{tipo_documento}_{timestamp}.pdf`

**Ejemplo de estructura:**
```
/app/storage/documents/
├── 12345678/
│   ├── uuid1_DNI_1691234567890.pdf
│   ├── uuid2_CUIL_1691234567891.pdf
│   └── uuid3_CERTIFICADO_1691234567892.pdf
└── 87654321/
    ├── uuid4_DNI_1691234567893.pdf
    └── uuid5_TITULO_1691234567894.pdf
```

**Servicio Responsable:** `FileSystemDocumentStorageService.java`

### 2. Documentos de CV (`/cv-documents`)

**Características:**
- **Tamaño:** 18MB
- **Contenido:** Documentos de experiencia laboral y educación
- **Gestión:** Módulos de `education` y `experience`

### 3. Bases de Concursos (`/contest-bases`)

**Características:**
- **Tamaño:** 15MB
- **Contenido:** PDFs con bases y condiciones de concursos
- **Acceso:** Público para descarga por postulantes

### 4. Imágenes de Perfil (`/profile-images`)

**Características:**
- **Tamaño:** 324KB
- **Formato:** Imágenes de perfil de usuarios
- **Servicio:** `ProfileImageService`

## Configuración de Propiedades

### Variables de Configuración Identificadas

```properties
# Sistema de almacenamiento centralizado
app.storage.base-dir=./storage
app.storage.documents-dir=documents
app.storage.contest-bases-dir=contest-bases
app.storage.cv-documents-dir=cv-documents
app.storage.profile-images-dir=profile-images
app.storage.temp-dir=temp

# Configuración de multipart para subida de archivos
spring.servlet.multipart.max-file-size=20MB
spring.servlet.multipart.max-request-size=20MB
spring.servlet.multipart.enabled=true
spring.servlet.multipart.resolve-lazily=true

# Configuración legacy (mantenida para compatibilidad)
app.document.storage.location=${app.storage.base-dir}/${app.storage.documents-dir}
app.file.upload-dir=${app.storage.base-dir}
app.file.contest-bases-dir=${app.storage.contest-bases-dir}
app.cv.document.storage.location=${app.storage.base-dir}/${app.storage.cv-documents-dir}
app.cv.document.temp-dir=${app.storage.base-dir}/${app.storage.temp-dir}

# Configuración de limpieza de archivos temporales
app.document.temp.cleanup.interval=3600
app.document.temp.max.age=86400

# Configuración de archivos CV
app.cv.document.max-size=10MB
app.cv.document.allowed-types=application/pdf,image/jpeg,image/png,image/jpg
```

## Mapeo de Volúmenes Docker

### Configuración Actual en docker-compose.yml

```yaml
services:
  backend:
    volumes:
      - storage_data_prod:/app/storage

volumes:
  storage_data_prod:
```

### Volúmenes No Utilizados

- **`mpd_concursos_document_storage_prod`**: Creado pero no montado
- **`mpd_concursos_backup_data_prod`**: Sin uso actual

## Servicios de Almacenamiento

### FileSystemDocumentStorageService

**Funcionalidades principales:**
- Almacenamiento de documentos por DNI de usuario
- Validación de nombres de archivo
- Limpieza automática de archivos temporales
- Gestión de permisos y directorios

**Métodos clave:**
- `storeFile()`: Almacena archivos con estructura organizada
- `getFile()`: Recupera archivos con validación de seguridad
- `deleteFile()`: Elimina archivos y directorios vacíos
- `cleanupTempFiles()`: Limpieza automática cada hora

### Características de Seguridad

1. **Validación de rutas:** Previene path traversal attacks
2. **Sanitización de nombres:** Elimina caracteres peligrosos
3. **Organización por usuario:** Aislamiento por DNI
4. **Limpieza automática:** Archivos temporales eliminados después de 24h

## Integración con Dashboard-Monitor

### Requisitos para el Dashboard

Para que el dashboard-monitor acceda a los documentos, necesita:

1. **Acceso al volumen:** Montar `mpd_concursos_storage_data_prod`
2. **Configuración de red:** Conectarse a `mpd_concursos_mpd-concursos-network`
3. **Variables de entorno:** Configurar rutas de almacenamiento

### Propuesta de Configuración Docker

```yaml
services:
  dashboard-monitor:
    volumes:
      - storage_data_prod:/app/storage:ro  # Solo lectura
      - dashboard-monitor_vector_store:/app/vector-store
    networks:
      - mpd-concursos-network
    environment:
      - STORAGE_BASE_DIR=/app/storage
      - DOCUMENTS_DIR=documents
```

## Estadísticas de Uso

### Distribución de Almacenamiento

| Tipo de Documento | Tamaño | Porcentaje | Archivos |
|-------------------|--------|------------|----------|
| Documentos Postulantes | 157MB | 82.6% | 359 |
| Documentos CV | 18MB | 9.5% | N/A |
| Bases de Concursos | 15MB | 7.9% | N/A |
| Imágenes de Perfil | 324KB | 0.2% | N/A |
| **Total** | **~190MB** | **100%** | **359+** |

### Crecimiento Proyectado

Basado en el uso actual:
- **Promedio por postulante:** ~2.3 documentos
- **Tamaño promedio por documento:** ~450KB
- **Capacidad actual:** Suficiente para ~4,400 documentos adicionales (1GB)

## Recomendaciones

### 1. Optimización de Almacenamiento

- **Compresión:** Implementar compresión automática para PDFs grandes
- **Limpieza:** Establecer políticas de retención de documentos antiguos
- **Monitoreo:** Implementar alertas de capacidad de almacenamiento

### 2. Backup y Recuperación

- **Backup automático:** Configurar respaldo diario del volumen `storage_data_prod`
- **Versionado:** Implementar versionado de documentos críticos
- **Recuperación:** Establecer procedimientos de recuperación ante desastres

### 3. Seguridad

- **Cifrado:** Considerar cifrado en reposo para documentos sensibles
- **Auditoría:** Implementar logs de acceso a documentos
- **Permisos:** Revisar y restringir permisos de acceso

### 4. Integración con Dashboard-Monitor

- **Acceso de solo lectura:** Montar volumen en modo read-only
- **API de documentos:** Crear endpoints específicos para el dashboard
- **Cache:** Implementar cache de metadatos de documentos

## Conclusiones

El sistema de almacenamiento de documentos de MPD Concursos está funcionando correctamente con:

✅ **Fortalezas:**
- Arquitectura bien estructurada y organizada
- Servicios de almacenamiento robustos con validaciones de seguridad
- Limpieza automática de archivos temporales
- Organización lógica por tipo de documento y usuario

⚠️ **Áreas de Mejora:**
- Falta de sistema de backup automatizado
- Volúmenes Docker no utilizados que generan confusión
- Ausencia de monitoreo de capacidad de almacenamiento
- Necesidad de integración con el dashboard-monitor

🔧 **Acciones Requeridas:**
1. Implementar sistema de backup para el volumen `storage_data_prod`
2. Limpiar configuración Docker eliminando volúmenes no utilizados
3. Configurar acceso del dashboard-monitor al almacenamiento
4. Establecer monitoreo y alertas de capacidad

El sistema está preparado para soportar el dashboard-monitor con las configuraciones adecuadas de volúmenes y red Docker.