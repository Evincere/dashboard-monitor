#!/bin/bash
# Script 1: Crear backup completo del estado actual

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/external_recovery"

echo "🔄 [$(date)] CREANDO BACKUP COMPLETO DEL ESTADO ACTUAL"
echo "📅 Timestamp: $TIMESTAMP"

# Crear directorio de backup
mkdir -p "$BACKUP_DIR"

echo "💾 Backup de volúmenes Docker..."
docker run --rm \
    -v mpd_concursos_storage_data_prod:/data \
    -v "$BACKUP_DIR":/backup \
    alpine tar czf "/backup/current_storage_$TIMESTAMP.tar.gz" -C /data .

echo "🗄️ Backup de base de datos..."
docker exec mpd-concursos-mysql-prod mysqldump -u root -proot1234 mpd_concursos > "$BACKUP_DIR/current_db_$TIMESTAMP.sql"

echo "📊 Creando inventario detallado..."
docker exec mpd-concursos-backend-prod find /app/storage -type f \( -name "*.pdf" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) > "$BACKUP_DIR/current_inventory_$TIMESTAMP.txt"

# Información del sistema
docker ps > "$BACKUP_DIR/docker_status_$TIMESTAMP.txt"
df -h > "$BACKUP_DIR/disk_usage_$TIMESTAMP.txt"

# Crear archivo de metadatos
cat > "$BACKUP_DIR/metadata_$TIMESTAMP.txt" << METADATA
BACKUP_TIMESTAMP=$TIMESTAMP
BACKUP_DATE=$(date)
TOTAL_DOCS=$(docker exec mpd-concursos-backend-prod find /app/storage/documents -name "*.pdf" | wc -l)
TOTAL_CV=$(docker exec mpd-concursos-backend-prod find /app/storage/cv-documents -name "*.pdf" | wc -l)
TOTAL_IMAGES=$(docker exec mpd-concursos-backend-prod find /app/storage/profile-images -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" | wc -l)
TOTAL_USERS=$(docker exec mpd-concursos-backend-prod ls /app/storage/documents | wc -l)
METADATA

echo "✅ Backup completo creado en: $BACKUP_DIR"
echo "📦 Archivos creados:"
ls -la "$BACKUP_DIR"/*$TIMESTAMP*

echo ""
echo "🎯 PRÓXIMO PASO:"
echo "Descargar todo el directorio $BACKUP_DIR a la máquina externa"
echo "Comando sugerido desde máquina externa:"
echo "scp -r root@$(hostname -I | awk '{print $1}'):$BACKUP_DIR ~/mpd_recovery_backup/"

echo ""
echo "⚠️ IMPORTANTE: Guarda este timestamp: $TIMESTAMP"
