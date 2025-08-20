#!/bin/bash

# Lista de archivos a actualizar
files=(
  "src/app/(dashboard)/page.tsx"
  "src/app/(dashboard)/postulations/page.tsx"
  "src/app/(dashboard)/postulations/[dni]/documents/validation/page.tsx"
  "src/app/(dashboard)/backups/page.tsx"
  "src/app/(dashboard)/validation/[dni]/page.tsx"
  "src/app/(dashboard)/settings/page.tsx"
  "src/app/(dashboard)/users/page.tsx"
  "src/app/(dashboard)/contests/page.tsx"
  "src/app/(dashboard)/database/page.tsx"
  "src/components/dashboard/schema-inspector.tsx"
  "src/components/dashboard/performance-monitor.tsx"
  "src/components/ui/file-upload.tsx"
  "src/components/dashboard/contest-status-chart.tsx"
  "src/components/dashboard/document-type-chart.tsx"
  "src/components/dashboard/inscription-stats-chart.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Actualizando $file..."
    
    # Agregar import si no existe
    if ! grep -q "import.*apiUrl.*from.*@/lib/utils" "$file"; then
      sed -i '1i import { apiUrl } from "@/lib/utils";' "$file"
    fi
    
    # Reemplazar todas las llamadas /api/ con apiUrl()
    sed -i "s|fetch('\(/api/[^']*\)'|fetch(apiUrl('\1'|g" "$file"
    sed -i "s|apiUrl('\/api\/|apiUrl('|g" "$file"
  fi
done

echo "¡Actualización completada!"
