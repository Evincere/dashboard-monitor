#!/bin/bash

# Script para detectar documentos huérfanos
# Documentos que existen en BD pero no tienen archivo físico

echo "🔍 DIAGNÓSTICO DE DOCUMENTOS HUÉRFANOS"
echo "======================================="
echo

DOCUMENTS_PATH="/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/documents"
RECOVERED_PATH="/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/recovered_documents"
BACKUP_PATH="/var/lib/docker/volumes/mpd_concursos_backup_data_prod/_data"

echo "📁 Rutas de búsqueda:"
echo "  - Documents: $DOCUMENTS_PATH"
echo "  - Recovered: $RECOVERED_PATH"  
echo "  - Backup: $BACKUP_PATH"
echo

orphaned_count=0
total_users=0

# Función para verificar si un archivo existe en alguna ubicación
check_file_exists() {
    local file_id="$1"
    local user_dni="$2"
    
    # Buscar en todas las ubicaciones posibles
    for base_path in "$DOCUMENTS_PATH" "$RECOVERED_PATH" "$BACKUP_PATH"; do
        if [ -d "$base_path/$user_dni" ]; then
            # Buscar archivo que comience con el ID
            if find "$base_path/$user_dni" -name "${file_id}*" -type f | grep -q .; then
                return 0  # Archivo encontrado
            fi
        fi
    done
    
    return 1  # Archivo no encontrado
}

echo "🔍 Analizando usuarios y sus documentos..."
echo

# Recorrer cada directorio de usuario
for user_dir in "$DOCUMENTS_PATH"/*; do
    if [ -d "$user_dir" ]; then
        dni=$(basename "$user_dir")
        total_users=$((total_users + 1))
        
        echo "👤 Usuario DNI: $dni"
        
        # Listar archivos físicos existentes
        existing_files=()
        if [ -d "$user_dir" ]; then
            while IFS= read -r -d '' file; do
                filename=$(basename "$file")
                file_id=${filename%%_*}  # Extraer ID antes del primer underscore
                existing_files+=("$file_id")
            done < <(find "$user_dir" -name "*.pdf" -print0)
        fi
        
        echo "   📄 Archivos físicos: ${#existing_files[@]}"
        for file_id in "${existing_files[@]}"; do
            echo "      ✅ ID: $file_id"
        done
        
        # TODO: Aquí se necesitaría consultar la BD para obtener los IDs esperados
        # Por ahora, solo mostramos los archivos existentes
        
        echo
    fi
done

echo "📊 RESUMEN"
echo "=========="
echo "Total usuarios analizados: $total_users"
echo "Documentos huérfanos detectados: $orphaned_count"

if [ $orphaned_count -gt 0 ]; then
    echo
    echo "⚠️  SE DETECTARON DOCUMENTOS HUÉRFANOS"
    echo "   Estos casos requieren atención administrativa"
    echo "   Los usuarios afectados deben re-subir su documentación"
fi

echo
echo "✅ Diagnóstico completado en $(date)"
