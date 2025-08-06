# GUÍA DE EJECUCIÓN COMPLETA - RECUPERACIÓN HÍBRIDA EXTERNA

## 🎯 Objetivo
Recuperar ~90% de documentos usando máquina externa con acceso root.

## 📋 Requisitos Verificados
- ✅ Máquina externa con acceso root SSH
- ✅ Espacio disponible: >5GB
- ✅ Conexión estable
- ✅ Tiempo disponible: 6-8 horas

## 🔄 PROCESO COMPLETO (8 PASOS)

### PASO 1: Preparar Paquete (EN EL SERVIDOR)
```bash
# Descargar paquete de scripts
scp -r root@servidor:/tmp/external_recovery_package ~/mpd_recovery_scripts/
cd ~/mpd_recovery_scripts/
chmod +x *.sh
```

### PASO 2: Crear Backup Actual (EN EL SERVIDOR)
```bash
ssh root@servidor
cd /tmp/external_recovery_package
./01_backup_current_state.sh
```
**⏱️ Tiempo**: 15-20 minutos
**📦 Resultado**: Backup completo en `/root/external_recovery/`

### PASO 3: Descargar Backup (DESDE MÁQUINA EXTERNA)
```bash
# En máquina externa
mkdir -p ~/mpd_recovery_backup
scp -r root@servidor:/root/external_recovery ~/mpd_recovery_backup/
```
**⏱️ Tiempo**: 10-15 minutos
**📦 Resultado**: Backup seguro en máquina externa

### PASO 4: Restaurar al 4 Agosto (DASHBOARD DEL PROVEEDOR)
- Ir a: Copias de seguridad
- Seleccionar: **04/08/2025 - Ubuntu 22.04**
- Confirmar restauración
- **ESPERAR** a que complete (15-30 min)

### PASO 5: Extraer del 4 Agosto (EN EL SERVIDOR)
```bash
ssh root@servidor
cd /tmp/external_recovery_package
./02_extract_from_backup.sh 4agosto root@maquina-externa ~/mpd_recovery_backup
```
**⏱️ Tiempo**: 20-30 minutos
**📦 Resultado**: Documentos del 4 agosto en máquina externa

### PASO 6: Restaurar al 5 Agosto (DASHBOARD DEL PROVEEDOR)
- Seleccionar: **05/08/2025 - Ubuntu 22.04**
- Confirmar restauración
- **ESPERAR** a que complete

### PASO 7: Extraer del 5 Agosto (EN EL SERVIDOR)
```bash
ssh root@servidor
cd /tmp/external_recovery_package
./02_extract_from_backup.sh 5agosto root@maquina-externa ~/mpd_recovery_backup
```
**⏱️ Tiempo**: 20-30 minutos
**📦 Resultado**: Documentos del 5 agosto en máquina externa

### PASO 8: Consolidar (EN MÁQUINA EXTERNA)
```bash
# En máquina externa
cd ~/mpd_recovery_backup
../mpd_recovery_scripts/03_consolidate_external.sh .
```
**⏱️ Tiempo**: 15-20 minutos
**📦 Resultado**: Archivo consolidado con todos los documentos

### PASO 9: Restaurar al 6 Agosto (DASHBOARD DEL PROVEEDOR)
- Seleccionar: **06/08/2025 - Ubuntu 22.04** (ÚLTIMO)
- Confirmar restauración
- **ESPERAR** a que complete

### PASO 10: Subir Consolidado (DESDE MÁQUINA EXTERNA)
```bash
# Subir archivo consolidado
scp consolidated_recovery_*.tar.gz root@servidor:/tmp/
```

### PASO 11: Integración Final (EN EL SERVIDOR)
```bash
ssh root@servidor
cd /tmp/external_recovery_package

# Obtener timestamp del paso 2 (guardado en metadata)
TIMESTAMP=$(grep BACKUP_TIMESTAMP /root/external_recovery/metadata_*.txt | cut -d'=' -f2)

./04_final_integration.sh /tmp/consolidated_recovery_*.tar.gz $TIMESTAMP
```
**⏱️ Tiempo**: 30-45 minutos
**📦 Resultado**: Sistema completo con ~90% de documentos recuperados

## 📊 RESULTADO ESPERADO

### Antes de la Recuperación
- Documentos: 349 PDFs
- Documentos CV: 11 PDFs
- Fotos perfil: 21 imágenes
- Usuarios: 103

### Después de la Recuperación (Proyectado)
- Documentos: ~700 PDFs (+350)
- Documentos CV: ~25 PDFs (+14)
- Fotos perfil: ~35 imágenes (+14)
- Usuarios: ~130 (+27)

## ⚠️ PUNTOS CRÍTICOS

1. **Guardar timestamp** del paso 2 (necesario para paso 11)
2. **No interrumpir** las restauraciones del dashboard
3. **Verificar conexión** antes de transferencias grandes
4. **Supervisar logs** durante todo el proceso
5. **Mantener backups** hasta verificar éxito completo

## 🆘 PLAN DE CONTINGENCIA

Si algo sale mal en cualquier paso:
1. **Restaurar al 6 agosto** (dashboard)
2. **Subir backup original** desde máquina externa
3. **Ejecutar solo la restauración** del estado actual
4. **Volver al estado previo** sin pérdida de datos

## ✅ VERIFICACIONES FINALES

Después del paso 11:
- [ ] Probar login de usuarios
- [ ] Verificar descarga de documentos
- [ ] Comprobar subida de nuevos archivos
- [ ] Revisar logs de aplicación
- [ ] Validar métricas del dashboard

---

**Tiempo total estimado**: 6-8 horas
**Tasa de éxito esperada**: 95%
**Recuperación proyectada**: ~90% de documentos
