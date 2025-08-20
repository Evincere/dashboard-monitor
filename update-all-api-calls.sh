#!/bin/bash

echo "Actualizando todas las llamadas API para usar basePath..."

# Encontrar todos los archivos TypeScript/React
find src -name "*.tsx" -o -name "*.ts" | while read file; do
  # Saltear archivos de test y de node_modules
  if [[ "$file" =~ test|node_modules|\.backup ]]; then
    continue
  fi
  
  # Verificar si el archivo tiene llamadas fetch a /api/
  if grep -q "fetch.*'/api/" "$file" || grep -q 'fetch.*`.*\/api\/' "$file"; then
    echo "Actualizando: $file"
    
    # Crear backup
    cp "$file" "$file.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Agregar import si no existe
    if ! grep -q "import.*apiUrl.*from.*@/lib/utils" "$file"; then
      sed -i '1i import { apiUrl } from "@/lib/utils";' "$file"
    fi
    
    # Reemplazar llamadas fetch simples con strings
    sed -i "s|fetch('\(/api/[^']*\)'|fetch(apiUrl('\1'|g" "$file"
    sed -i "s|apiUrl('\/api\/|apiUrl('|g" "$file"
    
    # Reemplazar llamadas fetch con template literals (más complejo)
    # Esto maneja casos como fetch(`/api/users/${id}`)
    sed -i 's|fetch(`/api/\([^`]*\)`|fetch(apiUrl(`\1`)|g' "$file"
    
    echo "  ✓ Procesado $file"
  fi
done

echo "¡Todas las llamadas API han sido actualizadas!"
