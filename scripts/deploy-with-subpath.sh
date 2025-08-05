#!/bin/bash

echo "🚀 Desplegando Dashboard Monitor con subpath /dashboard-monitor/"

# Verificar memoria
AVAILABLE_MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $7}')
echo "📊 Memoria disponible: ${AVAILABLE_MEMORY}MB"

if [ $AVAILABLE_MEMORY -lt 800 ]; then
    echo "⚠️  Memoria disponible baja. Recomendado: >800MB"
    read -p "¿Continuar de todos modos? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Detener aplicación si está funcionando
echo "🛑 Deteniendo aplicación existente..."
pkill -f "next start" 2>/dev/null || echo "No hay aplicación funcionando"

# Limpiar build anterior
echo "🧹 Limpiando build anterior..."
rm -rf .next

# Build con configuración de subpath
echo "🏗️  Construyendo aplicación con subpath..."
NODE_OPTIONS="--max-old-space-size=1024" npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error durante el build"
    exit 1
fi

# Verificar configuración de nginx
echo "🔍 Verificando configuración de Nginx..."
./scripts/check-nginx-config.sh

# Iniciar aplicación
echo "🚀 Iniciando aplicación..."
echo "🌐 La aplicación estará disponible en:"
echo "   - Directo: http://localhost:9002/dashboard-monitor/"
echo "   - A través de nginx: https://vps-4778464-x.dattaweb.com/dashboard-monitor/"
echo ""

# Iniciar con configuración optimizada
NODE_OPTIONS="--max-old-space-size=512" npm run start &

# Esperar a que la aplicación inicie
sleep 5

# Verificar que la aplicación esté funcionando
if curl -s http://localhost:9002/dashboard/api/health > /dev/null; then
    echo "✅ Aplicación iniciada correctamente"
    echo "🔗 Health check: http://localhost:9002/dashboard/api/health"
else
    echo "⚠️  La aplicación puede estar iniciando aún..."
    echo "💡 Verifica los logs si no funciona en unos minutos"
fi

echo ""
echo "📋 Próximos pasos:"
echo "   1. Ejecuta: ./scripts/add-dashboard-monitor-nginx.sh"
echo "   2. Accede a https://vps-4778464-x.dattaweb.com/dashboard-monitor/"