# 🔄 Sistema de Descarga de Backups - Funcionalidades Mejoradas

## 📋 Resumen de Cambios

Se ha mejorado significativamente el sistema de descarga de backups para permitir múltiples opciones de descarga y separar correctamente las funcionalidades de descarga y restauración.

## 🎯 Funcionalidades Implementadas

### 1. **Separación de Acciones**
- ✅ **Botón de Descarga**: Menú desplegable con opciones específicas
- ✅ **Botón de Restaurar**: Función independiente con confirmación
- ✅ **Botón de Eliminar**: Función independiente con confirmación

### 2. **Opciones de Descarga**

#### 📦 **Backup Completo (BD + Documentos)**
- Descarga un archivo ZIP que contiene:
  - Base de datos (.sql)
  - Documentos (.tar.gz)
  - Metadata de información (info.json)
- **URL**: `/api/backups/download?id={backupId}&type=combined`

#### 📄 **Solo Base de Datos**
- Descarga únicamente el archivo SQL de la base de datos
- **URL**: `/api/backups/download?id={backupId}&type=database`

#### 📁 **Solo Documentos**
- Descarga únicamente los documentos/archivos asociados
- **URL**: `/api/backups/download?id={backupId}&type=documents`

#### 🔄 **Auto-detección**
- Selecciona automáticamente el mejor tipo de descarga según el contenido del backup
- **URL**: `/api/backups/download?id={backupId}&type=auto`

## 🛠️ Mejoras Técnicas Implementadas

### Backend (API)

#### `src/app/api/backups/download/route.ts`
- ✅ **Validación de tipos de descarga**
- ✅ **Manejo inteligente de archivos existentes**
- ✅ **Creación de backups combinados dinámicos**
- ✅ **Generación de backups de documentos bajo demanda**
- ✅ **Limpieza automática de archivos temporales**
- ✅ **Headers HTTP apropiados para descarga**
- ✅ **Logging detallado de actividades**
- ✅ **Manejo robusto de errores**

#### Funciones Clave:
- `findDocumentsBackupPath()`: Busca archivos de documentos con múltiples patrones
- `createCombinedBackup()`: Crea ZIP con BD + documentos + metadata
- `createDocumentsOnlyBackup()`: Genera backup solo de documentos
- `handleDownloadRequest()`: Maneja lógica de descarga según el tipo
- `fileExists()`: Verificación segura de existencia de archivos

### Frontend (UI)

#### `src/app/(dashboard)/backups/page.tsx`
- ✅ **DropdownMenu con opciones de descarga**
- ✅ **Iconos descriptivos para cada tipo**
- ✅ **Estados de carga independientes**
- ✅ **Mensajes informativos específicos**
- ✅ **Validación de disponibilidad de documentos**
- ✅ **Manejo de estados disabled apropiado**

## 🎨 Mejoras de UX

### Indicadores Visuales
- 📦 **Package**: Backup completo
- 📄 **FileText**: Solo base de datos
- 📁 **Archive**: Solo documentos
- ⚠️ **Texto deshabilitado**: Cuando no hay documentos disponibles

### Estados Interactivos
- **Loading**: Spinner durante descarga
- **Disabled**: Para backups con integridad fallida
- **Tooltips**: Información adicional en hover
- **Badges**: Estado de inclusión de documentos

## 🔧 Configuración de Entornos

### Desarrollo
```bash
BACKUP_VOLUME_PATH="./database/backups"
DOCUMENTS_VOLUME_PATH="./storage/documents"
```

### Producción
```bash
BACKUP_VOLUME_PATH="/var/lib/docker/volumes/mpd_concursos_backup_data_prod/_data"
DOCUMENTS_VOLUME_PATH="/var/lib/docker/volumes/mpd_concursos_document_storage_prod/_data"
```

## 📁 Estructura de Archivos

```
./database/backups/
├── backup_metadata.json
├── backup_20241225_db.sql
├── backup_20241225_documents.tar.gz
└── temp_combined_files.zip (temporal)

./storage/documents/
├── postulation_docs/
├── reports/
└── user_uploads/
```

## 🚀 Flujo de Descarga

1. **Usuario selecciona tipo de descarga**
2. **Frontend envía petición a API con parámetros**
3. **Backend valida backup y tipo de descarga**
4. **Se determina archivos necesarios**
5. **Se crean archivos temporales si es necesario**
6. **Se inicia descarga del navegador**
7. **Se limpian archivos temporales después de 10s**

## 🔐 Validaciones de Seguridad

- ✅ Verificación de integridad del backup
- ✅ Validación de tipos de descarga permitidos
- ✅ Sanitización de nombres de archivos
- ✅ Verificación de existencia de archivos
- ✅ Limpieza de archivos temporales
- ✅ Headers de seguridad en respuestas

## 📊 Logging y Monitoreo

- 🔍 **Logs de descarga**: Backup, tipo, archivo, tamaño
- ⚠️ **Advertencias**: Archivos no encontrados, fallos de limpieza
- ❌ **Errores**: Fallos de creación, archivos corruptos
- ✅ **Éxito**: Creación y limpieza de archivos temporales

## 🔄 Compatibilidad

### Tipos MIME Soportados
- `application/sql` - Archivos de base de datos
- `application/gzip` - Archivos tar.gz de documentos  
- `application/zip` - Backups combinados
- `text/plain` - Placeholders de desarrollo
- `application/octet-stream` - Fallback genérico

### Navegadores
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## 🛡️ Manejo de Errores

### Errores Comunes y Respuestas
- **400**: Parámetros inválidos o faltantes
- **404**: Backup no encontrado
- **500**: Errores de servidor/sistema de archivos

### Mensajes de Usuario
- **Específicos por tipo de error**
- **Instrucciones de solución cuando sea posible**
- **Duración apropiada de notificaciones**

---

## 🎉 Resultado Final

El sistema ahora permite a los usuarios:
1. **Descargar exactamente lo que necesitan**
2. **Entender claramente qué están descargando**
3. **Tener confirmaciones apropiadas para acciones destructivas**
4. **Experimentar una interfaz intuitiva y responsiva**

La separación entre descarga y restauración elimina la confusión anterior donde el botón de "descarga" realmente iniciaba una restauración del backup.
