# Configuración de Almacenamiento de Documentos

Este documento describe cómo configurar correctamente el almacenamiento de documentos en el MPD Dashboard para evitar errores de "Document file not found".

## Resumen del Problema

El error "Document file not found" ocurre cuando el sistema no puede encontrar los archivos físicos de los documentos, aunque la información esté presente en la base de datos. Esto sucede porque las rutas de almacenamiento no están configuradas correctamente o los volúmenes no están montados.

## Variables de Entorno

### `LOCAL_DOCUMENTS_PATH`
**Descripción:** Ruta para documentos en desarrollo local  
**Valor por defecto:** `B:\concursos_situacion_post_gracia\descarga_administracion_20250814_191745\documentos`  
**Ejemplo:** `LOCAL_DOCUMENTS_PATH=/path/to/local/documents`

### `DOCUMENT_STORAGE_PATH`
**Descripción:** Ruta para documentos en producción (Docker)  
**Valor por defecto:** `/var/lib/docker/volumes/mpd_concursos_document_storage_prod/_data`  
**Ejemplo:** `DOCUMENT_STORAGE_PATH=/app/storage/documents`

## Estructura de Archivos Esperada

Los documentos deben estar organizados de la siguiente manera:

```
[DOCUMENT_STORAGE_PATH]/
├── [DNI_USUARIO]/
│   ├── documento1.pdf
│   ├── documento2.jpg
│   └── [ID_DOCUMENTO]_nombre_archivo.ext
└── [OTRO_DNI]/
    └── ...
```

### Ejemplo Práctico

```
/var/lib/docker/volumes/mpd_concursos_document_storage_prod/_data/
├── 12345678/
│   ├── cedula.pdf
│   ├── certificado_estudios.pdf
│   └── abc123-def456-ghi789_curriculum.pdf
└── 87654321/
    ├── cedula.pdf
    └── titulo_profesional.pdf
```

## Configuración por Ambiente

### Desarrollo Local

1. **Crear archivo `.env.local`:**
```bash
LOCAL_DOCUMENTS_PATH=C:\path\to\your\local\documents
# O en sistemas Unix:
# LOCAL_DOCUMENTS_PATH=/home/user/documents
```

2. **Crear estructura de directorios:**
```bash
mkdir -p /path/to/your/local/documents
```

3. **Verificar permisos:**
```bash
# En sistemas Unix
chmod -R 755 /path/to/your/local/documents
```

### Producción con Docker

1. **Configurar volumen en docker-compose.yml:**
```yaml
services:
  app:
    volumes:
      - document_storage:/app/storage/documents
    environment:
      - DOCUMENT_STORAGE_PATH=/app/storage/documents

volumes:
  document_storage:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /var/storage/documents
```

2. **Crear directorio en el host:**
```bash
sudo mkdir -p /var/storage/documents
sudo chown -R 1000:1000 /var/storage/documents
sudo chmod -R 755 /var/storage/documents
```

## Rutas de Búsqueda

El sistema busca archivos en el siguiente orden:

1. **Variable de entorno específica del ambiente:**
   - Desarrollo: `LOCAL_DOCUMENTS_PATH`
   - Producción: `DOCUMENT_STORAGE_PATH`

2. **Rutas de respaldo:**
   - `[PROJECT_ROOT]/storage/documents/`
   - `/app/storage/documents/` (contenedor Docker)
   - Ruta directa del archivo si es absoluta

## Formatos de Archivo Soportados

### Patrones de Nombre de Archivo

El sistema busca archivos usando estos patrones:

1. **Ruta directa:** `[DNI_USUARIO]/nombre_archivo.ext`
2. **Con prefijo UUID:** `[ID_DOCUMENTO]_nombre_archivo.ext`
3. **Solo UUID:** `[ID_DOCUMENTO]*`

### Tipos de Archivo

- **PDFs:** `.pdf` - Se muestran en iframe
- **Imágenes:** `.jpg`, `.jpeg`, `.png`, `.gif` - Se muestran como imagen
- **Otros:** Se descargan automáticamente

## Diagnóstico y Resolución de Problemas

### 1. Verificar Variables de Entorno

```bash
# En el contenedor o servidor
echo $DOCUMENT_STORAGE_PATH
echo $LOCAL_DOCUMENTS_PATH
```

### 2. Verificar Estructura de Directorios

```bash
ls -la /path/to/documents/
ls -la /path/to/documents/[DNI_USUARIO]/
```

### 3. Verificar Permisos

```bash
# Verificar que el usuario puede leer los archivos
ls -la /path/to/documents/[DNI_USUARIO]/archivo.pdf
```

### 4. Logs de Diagnóstico

Los logs del sistema incluyen información detallada:

```
🔍 [DOCUMENT_VIEW] Starting document view request
📋 [DOCUMENT_VIEW] Document ID: abc123-def456
📁 [DOCUMENT_VIEW] File resolution details:
   - File Name: documento.pdf
   - File Path: 12345678/documento.pdf
   - MIME Type: application/pdf
📁 [DOCUMENT_VIEW] Attempting file access from paths:
   1. /var/storage/documents/12345678/documento.pdf
   2. /app/storage/documents/12345678/documento.pdf
```

### 5. Casos Comunes de Error

#### Error: "Document file not found"
**Causa:** Archivo no existe en las rutas esperadas  
**Solución:** Verificar que el archivo existe y tiene los permisos correctos

#### Error: "Document not found in any user's document collection"
**Causa:** El documento no está asociado a ningún usuario en la base de datos  
**Solución:** Verificar la integridad de los datos en la base de datos

#### Error: "Failed to fetch users from backend"
**Causa:** Problema de conexión con el backend  
**Solución:** Verificar conectividad y configuración del backend

## Script de Verificación

Crear un script para verificar la configuración:

```bash
#!/bin/bash
# verify-document-storage.sh

echo "=== Verificación de Almacenamiento de Documentos ==="

# Verificar variables de entorno
echo "1. Variables de entorno:"
echo "   LOCAL_DOCUMENTS_PATH: ${LOCAL_DOCUMENTS_PATH:-'No configurada'}"
echo "   DOCUMENT_STORAGE_PATH: ${DOCUMENT_STORAGE_PATH:-'No configurada'}"

# Verificar directorios
echo "2. Verificar directorios:"
for path in "$LOCAL_DOCUMENTS_PATH" "$DOCUMENT_STORAGE_PATH" "./storage/documents" "/app/storage/documents"; do
    if [ -n "$path" ] && [ -d "$path" ]; then
        echo "   ✅ $path - Existe"
        echo "      Permisos: $(ls -ld "$path" | cut -d' ' -f1)"
        echo "      Archivos: $(find "$path" -type f | wc -l)"
    elif [ -n "$path" ]; then
        echo "   ❌ $path - No existe"
    fi
done

echo "3. Verificación completada"
```

## Migración de Documentos

### Script para Migrar Archivos

```bash
#!/bin/bash
# migrate-documents.sh

SOURCE_PATH="$1"
TARGET_PATH="$2"

if [ -z "$SOURCE_PATH" ] || [ -z "$TARGET_PATH" ]; then
    echo "Uso: $0 <ruta_origen> <ruta_destino>"
    exit 1
fi

echo "Migrando documentos de $SOURCE_PATH a $TARGET_PATH"

# Crear directorio destino
mkdir -p "$TARGET_PATH"

# Copiar archivos manteniendo estructura
rsync -av --progress "$SOURCE_PATH/" "$TARGET_PATH/"

echo "Migración completada"
```

## Monitoreo y Mantenimiento

### 1. Verificación Regular de Espacio

```bash
# Verificar espacio disponible
df -h /path/to/documents/

# Verificar cantidad de archivos
find /path/to/documents -type f | wc -l
```

### 2. Limpieza de Archivos Huérfanos

```bash
# Buscar archivos sin referencia en la base de datos
# (Requiere consulta a la base de datos)
```

### 3. Backup Regular

```bash
# Backup incremental
rsync -av --link-dest=/backup/documents/latest \
      /path/to/documents/ \
      /backup/documents/$(date +%Y%m%d)

# Actualizar enlace latest
rm -f /backup/documents/latest
ln -s $(date +%Y%m%d) /backup/documents/latest
```

## Contacto y Soporte

Para problemas relacionados con la configuración de documentos:

1. Verificar los logs del sistema
2. Ejecutar el script de verificación
3. Consultar este documento
4. Contactar al equipo de desarrollo con los logs relevantes

---

**Última actualización:** $(date)  
**Versión:** 1.0
