#!/bin/bash

# Script para verificar documentos de un usuario específico
# Uso: ./check-user-documents.sh DNI

if [ $# -eq 0 ]; then
    echo "❌ Error: Debe proporcionar un DNI"
    echo "💡 Uso: $0 <DNI>"
    echo "📝 Ejemplo: $0 34642267"
    exit 1
fi

DNI="$1"
DOCUMENTS_PATH="/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/documents"

echo "🔍 VERIFICACIÓN DE DOCUMENTOS"
echo "============================="
echo "👤 Usuario DNI: $DNI"
echo "📅 Fecha: $(date)"
echo

# Verificar si existe el directorio del usuario
USER_DIR="$DOCUMENTS_PATH/$DNI"

if [ ! -d "$USER_DIR" ]; then
    echo "❌ ERROR: No existe directorio para usuario DNI $DNI"
    echo "📁 Ruta buscada: $USER_DIR"
    echo
    echo "🔧 Posibles soluciones:"
    echo "  1. Verificar que el DNI sea correcto"
    echo "  2. El usuario puede no haber subido documentos"
    echo "  3. Los documentos pueden estar en recovered_documents"
    exit 1
fi

echo "✅ Directorio del usuario encontrado"
echo "📂 Ruta: $USER_DIR"
echo

# Listar archivos del usuario
echo "📄 DOCUMENTOS FÍSICOS ENCONTRADOS:"
echo "=================================="

file_count=0
total_size=0

for file in "$USER_DIR"/*.pdf; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        file_id=${filename%%_*}
        size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
        size_mb=$(echo "scale=2; $size/1024/1024" | bc 2>/dev/null || echo "N/A")
        
        echo "  ✅ $filename"
        echo "     🆔 ID: $file_id"
        echo "     📏 Tamaño: ${size_mb} MB"
        echo
        
        file_count=$((file_count + 1))
        total_size=$((total_size + size))
    fi
done

if [ $file_count -eq 0 ]; then
    echo "❌ No se encontraron archivos PDF en el directorio"
else
    total_mb=$(echo "scale=2; $total_size/1024/1024" | bc 2>/dev/null || echo "N/A")
    echo "📊 RESUMEN:"
    echo "  📄 Total archivos: $file_count"
    echo "  💾 Tamaño total: ${total_mb} MB"
fi

echo
echo "🔍 PARA DIAGNÓSTICO COMPLETO:"
echo "curl -s -k 'https://localhost/dashboard-monitor/api/documents/diagnostics?limit=1000' | grep '$DNI'"
echo
echo "✅ Verificación completada"
