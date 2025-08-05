# Mapa Completo de Almacenamiento - Sistema MPD Concursos

## Resumen Ejecutivo

Este documento presenta el mapa definitivo y completo de todos los lugares donde se almacenan documentos, respaldos y backups en el sistema MPD Concursos, con sus tamaños actuales y estados operacionales.

## 📁 **ALMACENAMIENTO PRINCIPAL DE DOCUMENTOS**

### 1. Volumen Docker Principal (ACTIVO)
**Ubicación:** `/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data`
**Montado en contenedor:** `mpd-concursos-backend:/app/storage`
**Tamaño total:** 190MB
**Estado:** ✅ **ACTIVO - ALMACENAMIENTO PRINCIPAL**

**Estructura detallada:**
```
/app/storage/ (190MB total)
├── documents/          157MB  ← DOCUMENTOS DE USUARIOS (359 archivos)
├── cv-documents/       18MB   ← Documentos de CV y experiencia
├── contest-bases/      15MB   ← Bases de concursos (PDFs)
├── profile-images/     324KB  ← Imágenes de perfil de usuarios
├── contest-descriptions/ 4KB  ← Descripciones de concursos
└── temp/               4KB    ← Archivos temporales
```

**Análisis:**
- ✅ **Almacenamiento principal funcionando correctamente**
- ✅ **359 documentos de usuarios organizados por DNI**
- ✅ **Sistema de limpieza automática de archivos temporales**
- ✅ **Estructura bien organizada y accesible**

### 2. Volúmenes Docker No Utilizados

#### mpd_concursos_document_storage_prod
**Ubicación:** `/var/lib/docker/volumes/mpd_concursos_document_storage_prod/_data`
**Tamaño:** 8KB (prácticamente vacío)
**Estado:** ❌ **NO UTILIZADO**
**Análisis:** Volumen creado pero no montado en ningún contenedor

#### mpd_concursos_backup_data_prod  
**Ubicación:** `/var/lib/docker/volumes/mpd_concursos_backup_data_prod/_data`
**Tamaño:** 4KB (prácticamente vacío)
**Estado:** ❌ **NO UTILIZADO**
**Análisis:** Volumen designado para backups pero no utilizado por el sistema automático

### 3. Almacenamiento Local del Proyecto (LEGACY)
**Ubicación:** `/home/semper/concursos/mpd_concursos/storage/`
**Tamaño:** 15MB
**Estado:** ⚠️ **LEGACY - SOLO BASES DE CONCURSOS**

**Contenido:**
```
/home/semper/concursos/mpd_concursos/storage/
└── contest-bases/      15MB  ← Bases de concursos (archivos locales)
```

#### document-storage (VACÍO)
**Ubicación:** `/home/semper/concursos/mpd_concursos/document-storage/`
**Tamaño:** 4KB (vacío)
**Estado:** ❌ **NO UTILIZADO**

## 💾 **SISTEMA DE RESPALDOS AUTOMÁTICOS**

### 1. Respaldos Automáticos Principales (ACTIVO)
**Ubicación:** `/opt/mpd-monitor/backups/`
**Tamaño total:** 383MB
**Frecuencia:** Cada 6 horas (00:00, 06:00, 12:00, 18:00)
**Estado:** ✅ **FUNCIONANDO PERFECTAMENTE**

**Archivos recientes:**
```
/opt/mpd-monitor/backups/
├── db_backup_20250804_180001.sql.gz      195KB  ← Base de datos (último)
├── files_backup_20250804_180001.tar.gz   145MB  ← Archivos (último)
├── backup_report_20250804_180001.txt     1.4KB  ← Reporte automático
├── db_backup_20250804_120001.sql.gz      177KB  ← BD anterior
├── files_backup_20250804_120001.tar.gz   115MB  ← Archivos anterior
└── [archivos anteriores...]               ~42MB  ← Respaldos históricos
```

**Configuración:**
- ✅ **Cron configurado:** 4 ejecuciones diarias
- ✅ **Compresión automática:** Habilitada
- ✅ **Retención:** 30 días automática
- ✅ **Logs detallados:** `/var/log/mpd-backup.log`
- ✅ **Reportes automáticos:** Generados en cada ejecución

### 2. Respaldos Manuales Legacy (INACTIVOS)
**Ubicación:** `/home/semper/concursos/mpd_concursos/backups/`
**Tamaño:** 2MB
**Estado:** ⚠️ **LEGACY - SISTEMA ANTERIOR**

**Archivos encontrados:**
```
/home/semper/concursos/mpd_concursos/backups/
├── mpd_concursos_20250801_071127.sql     367KB  ← Último manual (BD)
├── mpd_concursos_20250731_230019.sql     362KB  ← Anterior
└── [archivos anteriores...]               ~1.3MB ← Respaldos históricos
```

### 3. Respaldos de Storage Legacy (INACTIVOS)
**Ubicación:** `/home/semper/concursos/mpd_concursos/`
**Archivos:**
```
├── storage_backup_20250731_100528.tar.gz     45MB  ← Respaldo manual anterior
└── storage_backup_actual_20250803_111402.tar.gz  45MB  ← Último manual
```
**Estado:** ⚠️ **LEGACY - REEMPLAZADO POR SISTEMA AUTOMÁTICO**

## 🗄️ **BASE DE DATOS**

### Volumen MySQL Principal
**Ubicación:** `/var/lib/docker/volumes/mpd_concursos_mysql_data_prod/_data`
**Montado en:** `mpd-concursos-mysql:/var/lib/mysql`
**Tamaño:** 207MB
**Estado:** ✅ **ACTIVO - BASE DE DATOS PRINCIPAL**

**Análisis:**
- ✅ **Base de datos MySQL 8.0 funcionando**
- ✅ **Respaldos automáticos cada 6 horas**
- ✅ **Configuración de memoria: 800MB asignados**

## 📊 **RESUMEN DE TAMAÑOS Y ESTADOS**

### Almacenamiento Activo
| Ubicación | Tamaño | Estado | Función |
|-----------|--------|--------|---------|
| `/app/storage` (Docker) | 190MB | ✅ ACTIVO | Almacenamiento principal |
| `/opt/mpd-monitor/backups` | 383MB | ✅ ACTIVO | Respaldos automáticos |
| MySQL data (Docker) | 207MB | ✅ ACTIVO | Base de datos |
| **TOTAL ACTIVO** | **780MB** | ✅ | **Sistema funcionando** |

### Almacenamiento Legacy/No Utilizado
| Ubicación | Tamaño | Estado | Función |
|-----------|--------|--------|---------|
| `document_storage_prod` | 8KB | ❌ NO USADO | Volumen no utilizado |
| `backup_data_prod` | 4KB | ❌ NO USADO | Volumen no utilizado |
| `/home/.../backups` | 2MB | ⚠️ LEGACY | Respaldos manuales antiguos |
| `/home/.../storage` | 15MB | ⚠️ LEGACY | Solo bases de concursos |
| Storage backups manuales | 90MB | ⚠️ LEGACY | Respaldos manuales |
| **TOTAL LEGACY** | **107MB** | ⚠️ | **No crítico** |

## 🔍 **ANÁLISIS DE FLUJO DE DATOS**

### Carga de Documentos por Usuarios
```
Usuario carga documento
        ↓
Frontend (Angular) → Backend (Spring Boot)
        ↓
FileSystemDocumentStorageService
        ↓
/app/storage/documents/{DNI_USUARIO}/{id}_{tipo}_{timestamp}.pdf
        ↓
Volumen Docker: mpd_concursos_storage_data_prod
```

### Proceso de Respaldo Automático
```
Cron (cada 6 horas)
        ↓
/opt/mpd-monitor/backup-complete.sh
        ↓
├── Base de datos: mysqldump → db_backup_{timestamp}.sql.gz
└── Archivos: tar + gzip → files_backup_{timestamp}.tar.gz
        ↓
/opt/mpd-monitor/backups/ (retención 30 días)
        ↓
Logs → /var/log/mpd-backup.log
```

## 🎯 **CONCLUSIONES DEFINITIVAS**

### ✅ **Sistema Funcionando Correctamente**

1. **Almacenamiento Principal:**
   - 359 documentos de usuarios (157MB) almacenados correctamente
   - Estructura organizada por DNI de usuario
   - Sistema de limpieza automática funcionando

2. **Sistema de Respaldos:**
   - Respaldos automáticos cada 6 horas funcionando perfectamente
   - Último respaldo: hace pocas horas (4 agosto 18:00)
   - Cobertura completa: BD + archivos
   - Retención automática de 30 días

3. **Redundancia:**
   - Datos principales: 190MB en volumen Docker
   - Respaldos automáticos: 383MB con historial
   - Ventana de riesgo máxima: 6 horas

### ⚠️ **Elementos No Críticos**

1. **Volúmenes Docker no utilizados:** No afectan el funcionamiento
2. **Respaldos legacy:** Pueden mantenerse como respaldo adicional
3. **Almacenamiento local:** Solo contiene bases de concursos

### 🚀 **Para Dashboard-Monitor**

**Acceso requerido:**
- **Lectura:** Volumen `mpd_concursos_storage_data_prod` (190MB)
- **Respaldos:** Directorio `/opt/mpd-monitor/backups/` (383MB)
- **Base de datos:** Conexión a `mpd-concursos-mysql`

**Configuración Docker sugerida:**
```yaml
dashboard-monitor:
  volumes:
    - mpd_concursos_storage_data_prod:/app/storage:ro
    - /opt/mpd-monitor/backups:/app/backups:ro
    - dashboard-monitor_vector_store:/app/vector-store:rw
```

## 📈 **Estado Final**

**SISTEMA COMPLETAMENTE FUNCIONAL Y PROTEGIDO**
- ✅ Documentos almacenados correctamente (190MB)
- ✅ Respaldos automáticos funcionando (383MB)
- ✅ Base de datos operativa (207MB)
- ✅ Ventana de riesgo mínima (6 horas máximo)
- ✅ Retención automática configurada (30 días)

**Total de datos bajo protección:** 780MB activos + 383MB en respaldos = **1.16GB de datos seguros**