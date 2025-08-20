#!/bin/bash

echo "Corrigiendo errores de sintaxis..."

# Lista de archivos que tuvieron errores
files=(
  "src/app/(dashboard)/backups/page.tsx"
  "src/app/(dashboard)/contests/page.tsx" 
  "src/app/(dashboard)/database/page.tsx"
  "src/app/(dashboard)/documents/page.tsx"
  "src/app/(dashboard)/page.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Corrigiendo $file..."
    
    # Mover 'use client' al principio
    if grep -q "'use client'" "$file"; then
      # Remover todas las líneas 'use client'
      sed -i "/'use client'/d" "$file"
      # Agregar 'use client' al principio
      sed -i "1i 'use client';\n" "$file"
    fi
    
    # Corregir llamadas fetch incompletas (falta paréntesis de cierre)
    sed -i 's|apiUrl(\([^)]*\);|apiUrl(\1));|g' "$file"
    sed -i 's|apiUrl(\([^)]*\), {|apiUrl(\1), {|g' "$file"
    
  fi
done

echo "¡Errores de sintaxis corregidos!"
