# Database Backups - MPD Concursos

## Descripción
Este directorio contiene los backups de la base de datos `mpd_concursos` descargados desde el servidor de producción.

## Archivos de Backup

### mpd_concursos_backup_20250815_075905.sql.gz
- **Fecha de creación**: 15/08/2025 07:59:05 UTC
- **Tamaño comprimido**: ~1.0 MB
- **Tamaño descomprimido**: ~3.9 MB
- **Tablas incluidas**: 54 tablas
- **Base de datos origen**: `mpd_concursos`
- **Contenido**: Estructura completa + datos + rutinas + triggers

## Restauración Local

Para restaurar el backup en un entorno local MySQL:

```bash
# Descomprimir y restaurar directamente
gunzip -c mpd_concursos_backup_20250815_075905.sql.gz | mysql -u root -p nombre_bd_local

# O descomprimir primero y luego restaurar
gunzip mpd_concursos_backup_20250815_075905.sql.gz
mysql -u root -p nombre_bd_local < mpd_concursos_backup_20250815_075905.sql
```

## Información de Context

Este backup contiene los datos de producción de la plataforma de concursos del MPD, incluyendo:
- Usuarios registrados (252 aptos para validación administrativa)
- Documentación cargada por usuarios
- Estructura completa de concursos y respuestas
- Configuraciones del sistema

## Notas de Seguridad

⚠️ **IMPORTANTE**: Este backup contiene datos sensibles de producción. Mantener seguro y no compartir.
