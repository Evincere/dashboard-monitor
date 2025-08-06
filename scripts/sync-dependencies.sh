#!/bin/bash

echo "🔄 Sincronizando dependencias..."

# Verificar que Node.js esté instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi

# Verificar versión de Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ $NODE_VERSION -lt 20 ]; then
    echo "⚠️  Versión de Node.js: v$(node -v)"
    echo "💡 Se recomienda Node.js 20+ para compatibilidad completa"
fi

# Limpiar cache de npm
echo "🧹 Limpiando cache de npm..."
npm cache clean --force

# Eliminar node_modules y package-lock.json
echo "🗑️  Eliminando instalación anterior..."
rm -rf node_modules
rm -f package-lock.json

# Reinstalar dependencias
echo "📦 Instalando dependencias..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencias sincronizadas correctamente"
    echo ""
    echo "🔍 Verificando instalación..."
    npm list --depth=0 | grep redis
    echo ""
    echo "🚀 Ahora puedes ejecutar: ./scripts/deploy-docker.sh"
else
    echo "❌ Error al instalar dependencias"
    exit 1
fi