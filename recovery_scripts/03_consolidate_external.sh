#!/bin/bash
# Script 3: Consolidar todos los archivos en máquina externa
# EJECUTAR EN LA MÁQUINA EXTERNA

RECOVERY_DIR="$1"
if [ -z "$RECOVERY_DIR" ]; then
    RECOVERY_DIR="~/mpd_recovery_backup"
fi

echo "🔄 [$(date)] CONSOLIDANDO ARCHIVOS EN MÁQUINA EXTERNA"
echo "📁 Directorio de trabajo: $RECOVERY_DIR"

cd "$RECOVERY_DIR" || exit 1

# Crear directorio de consolidación
mkdir -p consolidated/{documents,cv-documents,profile-images}

echo "📦 Extrayendo archivos de respaldos..."

# Extraer backup actual (estado de hoy)
if ls external_recovery/current_storage_*.tar.gz 1> /dev/null 2>&1; then
    CURRENT_BACKUP=$(ls external_recovery/current_storage_*.tar.gz | head -1)
    echo "📁 Extrayendo estado actual: $CURRENT_BACKUP"
    mkdir -p temp_current
    tar -xzf "$CURRENT_BACKUP" -C temp_current/
fi

# Extraer extracción del 4 agosto
if ls extraction_4agosto_*.tar.gz 1> /dev/null 2>&1; then
    EXTRACTION_4=$(ls extraction_4agosto_*.tar.gz | head -1)
    echo "📁 Extrayendo 4 agosto: $EXTRACTION_4"
    mkdir -p temp_4agosto
    tar -xzf "$EXTRACTION_4" -C temp_4agosto/
fi

# Extraer extracción del 5 agosto
if ls extraction_5agosto_*.tar.gz 1> /dev/null 2>&1; then
    EXTRACTION_5=$(ls extraction_5agosto_*.tar.gz | head -1)
    echo "📁 Extrayendo 5 agosto: $EXTRACTION_5"
    mkdir -p temp_5agosto
    tar -xzf "$EXTRACTION_5" -C temp_5agosto/
fi

echo "🔄 Consolidando documentos únicos..."

# Función para consolidar sin sobrescribir
consolidate_unique() {
    local source_base="$1"
    local target_base="$2"
    local type="$3"
    
    echo "Consolidando $type desde $source_base..."
    
    if [ -d "$source_base/$type" ]; then
        for user_dir in "$source_base/$type"/*; do
            if [ -d "$user_dir" ]; then
                user_id=$(basename "$user_dir")
                target_dir="$target_base/$type/$user_id"
                
                if [ ! -d "$target_dir" ]; then
                    mkdir -p "$target_dir"
                    cp -r "$user_dir"/* "$target_dir/" 2>/dev/null || true
                    echo "✅ Usuario $user_id: Directorio completo copiado ($type)"
                else
                    # Copiar archivos individuales únicos
                    for file in "$user_dir"/*; do
                        if [ -f "$file" ]; then
                            filename=$(basename "$file")
                            if [ ! -f "$target_dir/$filename" ]; then
                                cp "$file" "$target_dir/"
                                echo "✅ Usuario $user_id: Archivo $filename recuperado ($type)"
                            fi
                        fi
                    done
                fi
            fi
        done
    fi
}

# Consolidar en orden: actual -> 4agosto -> 5agosto (prioridad al actual)
consolidate_unique "temp_current" "consolidated" "documents"
consolidate_unique "temp_4agosto" "consolidated" "documents"
consolidate_unique "temp_5agosto" "consolidated" "documents"

consolidate_unique "temp_current" "consolidated" "cv-documents"
consolidate_unique "temp_4agosto" "consolidated" "cv-documents"
consolidate_unique "temp_5agosto" "consolidated" "cv-documents"

consolidate_unique "temp_current" "consolidated" "profile-images"
consolidate_unique "temp_4agosto" "consolidated" "profile-images"
consolidate_unique "temp_5agosto" "consolidated" "profile-images"

# Crear estadísticas finales
echo "📊 Creando estadísticas finales..."
FINAL_DOCS=$(find consolidated/documents -name "*.pdf" 2>/dev/null | wc -l)
FINAL_CV=$(find consolidated/cv-documents -name "*.pdf" 2>/dev/null | wc -l)
FINAL_IMAGES=$(find consolidated/profile-images -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" 2>/dev/null | wc -l)
FINAL_USERS=$(ls consolidated/documents 2>/dev/null | wc -l)

cat > consolidated/final_stats.txt << STATS
CONSOLIDATION_DATE=$(date)
TOTAL_DOCUMENTS=$FINAL_DOCS
TOTAL_CV_DOCUMENTS=$FINAL_CV
TOTAL_IMAGES=$FINAL_IMAGES
TOTAL_USERS=$FINAL_USERS
STATS

echo "📦 Creando archivo final consolidado..."
tar -czf "consolidated_recovery_$(date +%Y%m%d_%H%M%S).tar.gz" -C consolidated .

echo "✅ CONSOLIDACIÓN COMPLETADA"
echo "📊 Estadísticas finales:"
echo "   📄 Documentos: $FINAL_DOCS"
echo "   📋 Documentos CV: $FINAL_CV"
echo "   🖼️ Imágenes: $FINAL_IMAGES"
echo "   👥 Usuarios: $FINAL_USERS"

# Limpiar archivos temporales
rm -rf temp_*

echo ""
echo "🎯 ARCHIVO FINAL LISTO:"
echo "$(ls consolidated_recovery_*.tar.gz | tail -1)"
echo ""
echo "📤 PRÓXIMO PASO:"
echo "Subir archivo consolidado al servidor y ejecutar integración final"
