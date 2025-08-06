# DOCUMENTACIÓN DE RECUPERACIÓN - MPD CONCURSOS

## 📅 Fecha de Creación
6 de Agosto 2025 - 19:15 hrs

## 🚨 Situación Identificada
- **Problema**: Pérdida de documentación de usuarios por configuración incorrecta de volúmenes Docker
- **Período crítico**: 4-5 agosto 2025
- **Usuarios afectados**: 28 usuarios sin documentos físicos
- **Documentos perdidos**: ~350 archivos estimados

## ✅ Recuperación Parcial Completada
- **Documentos recuperados**: 180+ archivos de backups locales
- **Usuarios beneficiados**: 26 usuarios
- **Tasa de recuperación actual**: ~45%

## �� Plan de Recuperación Híbrida Externa
Desarrollado para recuperar el 90% de documentos usando máquina externa con acceso root.

### Scripts Incluidos
- `recovery_scripts/01_backup_current_state.sh` - Backup completo del estado actual
- `recovery_scripts/02_extract_from_backup.sh` - Extracción desde respaldos históricos
- `recovery_scripts/03_consolidate_external.sh` - Consolidación en máquina externa
- `recovery_scripts/04_final_integration.sh` - Integración final en el servidor
- `recovery_scripts/GUIA_EJECUCION_COMPLETA.md` - Guía paso a paso detallada

### Usuarios Críticos Identificados (28 usuarios)
23520516, 24467884, 26569905, 27544194, 27651864, 27931606, 28226117, 28511308, 29267571, 29277615, 30108615, 30724462, 30984162, 31432016, 31737951, 31821855, 31854739, 32161223, 33579011, 33583216, 36746208, 36859594, 37002217, 37513884, 38207799, 39238641, 40787955, 41991997

## 🔧 Configuración Identificada del Sistema
Según análisis del código fuente del backend:

```properties
app.storage.base-dir=./storage
app.storage.documents-dir=documents
app.storage.cv-documents-dir=cv-documents
app.storage.profile-images-dir=profile-images
app.document.storage.location=${app.storage.base-dir}/${app.storage.documents-dir}
app.cv.document.storage.location=${app.storage.base-dir}/${app.storage.cv-documents-dir}
```

### Estructura Oficial de Directorios
```
./storage/
├── documents/          ← Documentos de inscripción
├── cv-documents/       ← Documentos de CV (experiencia/educación)
├── profile-images/     ← Fotos de perfil
├── contest-bases/      ← Bases de concursos
└── temp/              ← Archivos temporales
```

## 📊 Estado del Sistema al Momento del Commit

### Contenedores Docker
- mpd-concursos-frontend-prod: Up 3 hours (healthy)
- mpd-concursos-backend-prod: Up 3 hours (healthy)
- mpd-concursos-mysql-prod: Up 3 hours (healthy)

### Documentación Actual
- **Documentos de inscripción**: 349 PDFs
- **Documentos CV**: 11 PDFs
- **Fotos de perfil**: 21 imágenes
- **Usuarios con documentos**: 103 directorios

### Volúmenes Docker
- mpd_concursos_storage_data_prod: Volumen principal activo
- mpd_concursos_mysql_data_prod: Base de datos
- mpd_concursos_backup_data_prod: Backups (vacío)

## 🎯 Próximos Pasos
1. Ejecutar recuperación híbrida externa usando scripts incluidos
2. Validar integridad de documentos recuperados
3. Implementar medidas preventivas
4. Documentar lecciones aprendidas

## 📋 Archivos de Referencia
- Todos los scripts de recuperación en `recovery_scripts/`
- Documentación técnica completa
- Lista de usuarios afectados
- Configuración del sistema identificada

---

**Responsable**: Equipo de Recuperación  
**Estado**: Recuperación parcial completada, scripts preparados para recuperación completa  
**Commit**: Preservación de scripts y documentación antes de recuperación híbrida
