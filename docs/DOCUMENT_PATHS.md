# Document Path Configuration

Este documento explica cómo configurar las rutas de documentos para el sistema MPD Dashboard en diferentes entornos (desarrollo, staging, producción).

## Resumen

El sistema necesita acceso a los archivos de documentos de los postulantes para calcular tamaños de archivo y servir el contenido. La configuración es **sensible al entorno** y utiliza un sistema de **rutas prioritarias** con fallbacks automáticos.

## Variables de Entorno

### Configuración Principal

| Variable | Descripción | Ejemplo Desarrollo | Ejemplo Producción |
|----------|-------------|-------------------|-------------------|
| `DOCUMENTS_PATH` | Ruta principal (máxima prioridad) | No requerida | `/app/storage/documents` |
| `NODE_ENV` | Entorno de ejecución | `development` | `production` |
| `APP_STORAGE_BASE_DIR` | Directorio base (alineado con backend) | `./storage` | `/app/storage` |
| `APP_STORAGE_DOCUMENTS_DIR` | Subdirectorio de documentos | `documents` | `documents` |
| `BACKEND_STORAGE_PATH` | Ruta del backend (solo desarrollo) | `B:\CODE\PROYECTOS\concursos-mpd\concurso-backend\storage\documents` | No aplica |

### Configuración Específica por Entorno

#### Desarrollo (`NODE_ENV=development`)
```bash
LOCAL_DOCUMENTS_PATH=B:\concursos_situacion_post_gracia\descarga_administracion_20250814_191745\documentos
```

#### Producción (`NODE_ENV=production`)
```bash
DOCUMENTS_PATH=/app/storage/documents
# O cualquier ruta donde estén los documentos en el servidor
```

## Algoritmo de Resolución de Rutas

El sistema utiliza el siguiente orden de prioridad para encontrar documentos:

### 1. Ruta Principal (si está configurada)
```
${DOCUMENTS_PATH}/
```

### 2. Rutas Específicas por Entorno

#### Desarrollo:
- `${LOCAL_DOCUMENTS_PATH}/`
- `${process.cwd()}/storage/documents/`
- `${process.cwd()}/uploads/`
- `${STORAGE_BASE_DIR}/${DOCUMENTS_DIR}/`

#### Producción:
- `/app/storage/documents/`
- `/var/lib/mpd-documents/`
- `/opt/mpd/documents/`
- `${STORAGE_BASE_DIR}/${DOCUMENTS_DIR}/`

### 3. Rutas de Fallback (todos los entornos)
- `C:\app\storage\documents\` (Windows)
- `/tmp/mpd-documents/` (Linux/Unix)

## Estrategias de Búsqueda de Archivos

### 1. Búsqueda Exacta
Busca el archivo usando la ruta exacta: `{ruta_base}/{dni}/{nombre_archivo}`

### 2. Búsqueda Difusa (Fuzzy Matching)
Si la búsqueda exacta falla, utiliza el `documentId` (UUID) para buscar archivos que empiecen con ese ID en el directorio del usuario.

**Ejemplo:**
- Buscado: `35515608/Certificado de Antigüedad Profesional.pdf`
- Encontrado: `35515608/69fc33eb-49d7-49b9-8a9a-d51055841886_Certificado_de_Antig_edad_Profesional_1755111597882.pdf`

## Configuración por Tipo de Despliegue

### Desarrollo Local
```bash
# .env.local
NODE_ENV=development
LOCAL_DOCUMENTS_PATH=B:\concursos_situacion_post_gracia\descarga_administracion_20250814_191745\documentos
```

### Docker
```bash
# .env.production
NODE_ENV=production
DOCUMENTS_PATH=/app/storage/documents
```

```dockerfile
# Dockerfile
VOLUME ["/app/storage/documents"]
```

```yaml
# docker-compose.yml
volumes:
  - /host/path/to/documents:/app/storage/documents:ro
```

### Kubernetes
```bash
# .env.production
NODE_ENV=production
DOCUMENTS_PATH=/mnt/shared-storage/documents
```

```yaml
# deployment.yaml
spec:
  containers:
  - name: mpd-dashboard
    volumeMounts:
    - name: documents-volume
      mountPath: /mnt/shared-storage/documents
      readOnly: true
  volumes:
  - name: documents-volume
    persistentVolumeClaim:
      claimName: documents-pvc
```

### Servidor Bare Metal
```bash
# .env.production
NODE_ENV=production
DOCUMENTS_PATH=/opt/mpd-documents
```

## Estructura de Directorios Esperada

```
{DOCUMENTS_PATH}/
├── {dni1}/
│   ├── {uuid1}_documento1_{timestamp}.pdf
│   ├── {uuid2}_documento2_{timestamp}.pdf
│   └── ...
├── {dni2}/
│   ├── {uuid3}_documento3_{timestamp}.pdf
│   └── ...
└── ...
```

**Ejemplo:**
```
/app/storage/documents/
├── 35515608/
│   ├── 69fc33eb-49d7-49b9-8a9a-d51055841886_Certificado_de_Antig_edad_Profesional_1755111597882.pdf
│   ├── abc1dd8b-7cd7-49ba-80f8-49e908e89c0c_Certificado_Sin_Sanciones_Disciplinarias_1755111466557.pdf
│   └── 617be5ab-80dc-419c-8a58-49639bac9cd8_DNI__Frontal__1754703543247.pdf
└── 29222093/
    ├── f1505d15-3903-4c88-8c16-74f559a9f9cb_DNI__Frontal__1754703123456.pdf
    └── ...
```

## Verificación y Debugging

### Logs de Depuración
El sistema genera logs detallados para verificar la resolución de rutas:

```
📁 Document base paths (production): ["/app/storage/documents", "/var/lib/mpd-documents", ...]
📏 getFileSize: Processing filePath: "35515608/Certificado de Antigüedad Profesional.pdf"
📏 getFileSize: Trying exact path: "/app/storage/documents/35515608/Certificado de Antigüedad Profesional.pdf"
✅ getFileSize: File found (fuzzy match)! Size: 2847291 bytes
```

### Comandos de Verificación
```bash
# Verificar que la ruta de documentos existe
ls -la $DOCUMENTS_PATH

# Verificar permisos de lectura
test -r $DOCUMENTS_PATH && echo "Readable" || echo "Not readable"

# Verificar estructura de directorios
find $DOCUMENTS_PATH -maxdepth 2 -type d | head -10
```

## Troubleshooting

### Problema: Tamaños de archivo aparecen como 0.0 MB
**Causas posibles:**
1. La variable `DOCUMENTS_PATH` no está configurada correctamente
2. Los archivos no existen en la ruta especificada
3. Permisos insuficientes para leer los archivos
4. Estructura de directorios incorrecta

**Solución:**
1. Verificar logs: buscar "📁 Document base paths"
2. Verificar que la ruta existe y es legible
3. Revisar la estructura de directorios
4. Configurar la variable de entorno correcta

### Problema: Archivos no encontrados con fuzzy matching
**Causas posibles:**
1. Los nombres de archivo no coinciden con el patrón esperado
2. Los UUIDs no coinciden entre la base de datos y los nombres de archivo

**Solución:**
1. Verificar los logs de fuzzy matching
2. Revisar la consistencia entre DB y filesystem
3. Ajustar la lógica de matching si es necesario

## Migración Entre Entornos

### De Desarrollo a Producción
1. Configurar `DOCUMENTS_PATH` en producción
2. Migrar/montar los archivos de documentos
3. Verificar permisos de lectura
4. Probar con algunos documentos de prueba
5. Monitorear los logs durante el despliegue

### Checklist de Despliegue
- [ ] Variable `DOCUMENTS_PATH` configurada
- [ ] Directorio de documentos existe
- [ ] Permisos de lectura configurados
- [ ] Estructura de directorios correcta
- [ ] Logs muestran rutas correctas
- [ ] Tamaños de archivo se calculan correctamente

## Mejoras Futuras

1. **Caché de tamaños de archivo**: Para evitar recálculos constantes
2. **Configuración dinámica**: API para cambiar rutas sin restart
3. **Múltiples backends de almacenamiento**: S3, Azure Blob, etc.
4. **Compresión y optimización**: Para servir archivos más eficientemente
5. **Logs estructurados**: Para mejor monitoring en producción
