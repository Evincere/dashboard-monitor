# Plan de Limpieza de Almacenamiento Legacy - MPD Concursos

## Objetivo
Eliminar de manera segura el almacenamiento legacy no utilizado para mantener el sistema limpio y ordenado, sin afectar la funcionalidad actual.

## Análisis de Seguridad para Eliminación

### ✅ **SEGURO PARA ELIMINAR**

#### 1. Volúmenes Docker No Utilizados
- **`mpd_concursos_document_storage_prod`** (8KB)
  - ❌ No montado en ningún contenedor
  - ❌ No referenciado en docker-compose.yml actual
  - ✅ **SEGURO ELIMINAR**

- **`mpd_concursos_backup_data_prod`** (4KB)  
  - ❌ No utilizado por sistema de backup automático
  - ❌ Prácticamente vacío
  - ✅ **SEGURO ELIMINAR**

#### 2. Directorio document-storage Vacío
- **`/home/semper/concursos/mpd_concursos/document-storage/`** (4KB)
  - ❌ Completamente vacío
  - ❌ No utilizado por la aplicación
  - ✅ **SEGURO ELIMINAR**

### ⚠️ **MANTENER COMO RESPALDO TEMPORAL**

#### 3. Respaldos Manuales Legacy
- **`/home/semper/concursos/mpd_concursos/backups/`** (2MB)
  - ⚠️ Contiene respaldos de BD hasta el 1 agosto
  - ⚠️ Puede servir como respaldo adicional histórico
  - 🔄 **MANTENER POR AHORA** (revisar en 30 días)

#### 4. Storage Backups Manuales
- **`storage_backup_20250731_100528.tar.gz`** (45MB)
- **`storage_backup_actual_20250803_111402.tar.gz`** (45MB)
  - ⚠️ Respaldos manuales de archivos
  - ⚠️ Pueden contener datos no incluidos en respaldos automáticos
  - 🔄 **MANTENER POR AHORA** (revisar contenido)

### 🤔 **EVALUAR ANTES DE ELIMINAR**

#### 5. Storage Local Legacy
- **`/home/semper/concursos/mpd_concursos/storage/`** (15MB)
  - ⚠️ Contiene bases de concursos
  - ⚠️ Puede ser referenciado por código legacy
  - 🔍 **VERIFICAR REFERENCIAS** antes de eliminar

## Plan de Ejecución Seguro

### Fase 1: Eliminación Inmediata (Sin Riesgo)
```bash
# 1. Eliminar volúmenes Docker no utilizados
docker volume rm mpd_concursos_document_storage_prod
docker volume rm mpd_concursos_backup_data_prod

# 2. Eliminar directorio document-storage vacío
rm -rf /home/semper/concursos/mpd_concursos/document-storage/
```

### Fase 2: Verificación y Limpieza Gradual
```bash
# 3. Verificar referencias al storage local
grep -r "storage" /home/semper/concursos/mpd_concursos/concurso-backend/src/ | grep -v ".class"
grep -r "contest-bases" /home/semper/concursos/mpd_concursos/concurso-backend/src/

# 4. Comparar contenido de respaldos manuales vs automáticos
tar -tzf /home/semper/concursos/mpd_concursos/storage_backup_actual_20250803_111402.tar.gz | head -20
```

### Fase 3: Limpieza Final (Después de Verificación)
```bash
# Solo después de confirmar que no hay referencias críticas:
# rm -rf /home/semper/concursos/mpd_concursos/storage/
# rm /home/semper/concursos/mpd_concursos/storage_backup_*.tar.gz
# rm -rf /home/semper/concursos/mpd_concursos/backups/
```

## Espacio a Recuperar

### Eliminación Inmediata Segura
- Volúmenes Docker no utilizados: ~12KB
- Directorio document-storage: 4KB
- **Total inmediato:** ~16KB (mínimo pero limpia estructura)

### Eliminación Potencial (Después de Verificación)
- Storage local legacy: 15MB
- Respaldos manuales: 90MB  
- Respaldos BD legacy: 2MB
- **Total potencial:** ~107MB

## Beneficios de la Limpieza

### Inmediatos
- ✅ Elimina confusión sobre volúmenes no utilizados
- ✅ Limpia estructura Docker
- ✅ Reduce complejidad del sistema

### A Largo Plazo
- ✅ Recupera ~107MB de espacio en disco
- ✅ Simplifica mantenimiento
- ✅ Reduce puntos de confusión en auditorías futuras

## Riesgos y Mitigaciones

### Riesgos Identificados
1. **Pérdida de respaldos históricos**
   - Mitigación: Verificar que respaldos automáticos cubren el mismo período
   
2. **Referencias de código a storage local**
   - Mitigación: Búsqueda exhaustiva en código antes de eliminar

3. **Dependencias no documentadas**
   - Mitigación: Eliminación gradual con monitoreo

### Plan de Rollback
- Mantener respaldos de seguridad antes de eliminar
- Documentar exactamente qué se elimina
- Posibilidad de recrear volúmenes Docker si es necesario

## Recomendación

### Ejecutar Inmediatamente (Sin Riesgo)
```bash
# Eliminar volúmenes Docker no utilizados
docker volume rm mpd_concursos_document_storage_prod mpd_concursos_backup_data_prod
rm -rf /home/semper/concursos/mpd_concursos/document-storage/
```

### Evaluar en 1-2 Semanas
- Verificar referencias de código al storage local
- Comparar contenido de respaldos manuales vs automáticos
- Decidir sobre eliminación de archivos legacy más grandes

¿Procedo con la eliminación inmediata de los elementos sin riesgo?