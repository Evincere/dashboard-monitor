#!/bin/bash

echo "Corrigiendo errores restantes..."

# Corregir componentes
components=(
  "src/components/dashboard/contest-status-chart.tsx"
  "src/components/dashboard/document-type-chart.tsx"
  "src/components/dashboard/inscription-stats-chart.tsx"
  "src/components/ui/file-upload.tsx"
)

for file in "${components[@]}"; do
  if [ -f "$file" ]; then
    echo "Arreglando $file..."
    
    # Remover import de apiUrl y use client existentes
    sed -i '/import.*apiUrl.*from.*@\/lib\/utils/d' "$file"
    sed -i "/'use client'/d" "$file"
    
    # Agregar use client al principio, luego una línea vacía, luego el import
    sed -i "1i 'use client';\n\nimport { apiUrl } from \"@/lib/utils\";" "$file"
  fi
done

# Corregir llamadas con sintaxis incorrecta
sed -i 's|apiUrl('\''contests/upload'\'', {|apiUrl('\''contests/upload'\''), {|g' src/components/ui/file-upload.tsx
sed -i 's|apiUrl('\''backups'\'');|apiUrl('\''backups'\''));|g' src/app/\(dashboard\)/backups/page.tsx

echo "¡Errores restantes corregidos!"
