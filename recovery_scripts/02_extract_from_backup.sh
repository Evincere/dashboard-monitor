#!/bin/bash
# Script 2: Extraer documentos desde respaldos históricos

FECHA="$1"
EXTERNAL_HOST="$2"
EXTERNAL_PATH="$3"

if [ -z "$FECHA" ] || [ -z "$EXTERNAL_HOST" ] || [ -z "$EXTERNAL_PATH" ]; then
    echo "❌ Error: Parámetros faltantes"
    echo "Uso: $0 [4agosto|5agosto] usuario@host /path/to/backup"
    echo "Ejemplo: $0 4agosto root@external-machine ~/mpd_recovery_backup"
    exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EXTRACTION_DIR="/tmp/extraction_$FECHA"

echo "🔄 [$(date)] EXTRAYENDO DOCUMENTOS - $FECHA"

# Esperar a que los contenedores se inicien después de restauración
echo "⏳ Esperando inicialización de contenedores..."
sleep 60

# Verificar que los servicios estén disponibles
while ! docker ps | grep -q "mpd-concursos-backend-prod.*healthy\|mpd-concursos-backend-prod.*Up"; do
    echo "⏳ Esperando que el backend esté disponible..."
    sleep 30
done

# Crear directorio de extracción
mkdir -p "$EXTRACTION_DIR"

echo "📁 Extrayendo documentos completos..."

# Extraer todo el storage
if [ -d "/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data" ]; then
    cp -r /var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/* "$EXTRACTION_DIR/"
    echo "✅ Storage completo extraído"
else
    echo "❌ Error: Directorio de storage no encontrado"
    exit 1
fi

# Crear inventario
echo "📊 Creando inventario..."
find "$EXTRACTION_DIR" -name "*.pdf" | wc -l > "$EXTRACTION_DIR/pdf_count.txt"
find "$EXTRACTION_DIR" -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" | wc -l > "$EXTRACTION_DIR/image_count.txt"
ls "$EXTRACTION_DIR/documents" 2>/dev/null | wc -l > "$EXTRACTION_DIR/user_count.txt" || echo "0" > "$EXTRACTION_DIR/user_count.txt"

# Crear metadatos
cat > "$EXTRACTION_DIR/extraction_metadata.txt" << METADATA
EXTRACTION_DATE=$FECHA
EXTRACTION_TIMESTAMP=$TIMESTAMP
EXTRACTION_DATETIME=$(date)
PDF_COUNT=$(cat "$EXTRACTION_DIR/pdf_count.txt")
IMAGE_COUNT=$(cat "$EXTRACTION_DIR/image_count.txt")
USER_COUNT=$(cat "$EXTRACTION_DIR/user_count.txt")
METADATA

# Comprimir para transferencia
echo "📦 Comprimiendo extracción..."
tar -czf "/tmp/extraction_${FECHA}_$TIMESTAMP.tar.gz" -C "$EXTRACTION_DIR" .

# Transferir a máquina externa
echo "📤 Transfiriendo a máquina externa..."
scp "/tmp/extraction_${FECHA}_$TIMESTAMP.tar.gz" "$EXTERNAL_HOST:$EXTERNAL_PATH/"

# Mostrar estadísticas
PDF_COUNT=$(cat "$EXTRACTION_DIR/pdf_count.txt")
IMG_COUNT=$(cat "$EXTRACTION_DIR/image_count.txt")
USER_COUNT=$(cat "$EXTRACTION_DIR/user_count.txt")

echo "✅ Extracción completada - $FECHA"
echo "📊 Estadísticas:"
echo "   📄 PDFs: $PDF_COUNT"
echo "   🖼️ Imágenes: $IMG_COUNT"
echo "   👥 Usuarios: $USER_COUNT"
echo "   📦 Archivo: extraction_${FECHA}_$TIMESTAMP.tar.gz"
echo "   📤 Transferido a: $EXTERNAL_HOST:$EXTERNAL_PATH/"

# Limpiar archivos temporales
rm -rf "$EXTRACTION_DIR"
rm -f "/tmp/extraction_${FECHA}_$TIMESTAMP.tar.gz"

echo ""
echo "🎯 ARCHIVO DISPONIBLE EN MÁQUINA EXTERNA:"
echo "$EXTERNAL_PATH/extraction_${FECHA}_$TIMESTAMP.tar.gz"
