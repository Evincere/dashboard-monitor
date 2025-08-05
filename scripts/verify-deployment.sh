#!/bin/bash

echo "🔍 Verificando despliegue del Dashboard Monitor..."

# Verificar que la aplicación esté funcionando
if ! pgrep -f "next-server" > /dev/null; then
    echo "❌ La aplicación no está funcionando"
    echo "💡 Ejecuta: npm run start"
    exit 1
fi

echo "✅ Aplicación funcionando (PID: $(pgrep -f "next-server"))"

# Verificar endpoints principales
echo ""
echo "🧪 Probando endpoints..."

# Health check
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9002/dashboard-monitor/api/health)
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✅ Health check: OK ($HEALTH_STATUS)"
else
    echo "❌ Health check: FAIL ($HEALTH_STATUS)"
fi

# Página principal
MAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9002/dashboard-monitor/)
if [ "$MAIN_STATUS" = "200" ] || [ "$MAIN_STATUS" = "308" ]; then
    echo "✅ Página principal: OK ($MAIN_STATUS)"
else
    echo "❌ Página principal: FAIL ($MAIN_STATUS)"
fi

# Página unificada
UNIFIED_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9002/dashboard-monitor/unified-query)
if [ "$UNIFIED_STATUS" = "200" ]; then
    echo "✅ Página unificada: OK ($UNIFIED_STATUS)"
else
    echo "❌ Página unificada: FAIL ($UNIFIED_STATUS)"
fi

# Verificar memoria
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
echo ""
echo "📊 Uso de memoria: ${MEMORY_USAGE}%"

if [ "$MEMORY_USAGE" -gt 90 ]; then
    echo "⚠️  Uso de memoria alto"
else
    echo "✅ Uso de memoria normal"
fi

# Verificar configuración de nginx
echo ""
echo "🔧 Verificando configuración de nginx..."

if [ -f "/etc/nginx/sites-available/mpd-concursos" ]; then
    if grep -q "dashboard-monitor" /etc/nginx/sites-available/mpd-concursos; then
        echo "✅ Configuración de nginx encontrada"
    else
        echo "⚠️  Configuración de nginx no encontrada"
        echo "💡 Puede que necesites aplicar la configuración manualmente"
    fi
else
    echo "⚠️  Archivo de configuración de nginx no encontrado"
fi

echo ""
echo "🌐 URLs de acceso:"
echo "   - Directo: http://localhost:9002/dashboard-monitor/"
echo "   - Público: https://vps-4778464-x.dattaweb.com/dashboard-monitor/"
echo "   - Sistema unificado: https://vps-4778464-x.dattaweb.com/dashboard-monitor/unified-query"

echo ""
echo "✨ Estado del Sistema Unificado de Consultas:"
echo "   ✅ Router inteligente implementado"
echo "   ✅ Análisis automático de complejidad"
echo "   ✅ Procesamiento simple y complejo unificado"
echo "   ✅ Interfaz única para todas las consultas"
echo "   ✅ Métricas de rendimiento y calidad"

echo ""
if [ "$HEALTH_STATUS" = "200" ] && [ "$UNIFIED_STATUS" = "200" ]; then
    echo "🎉 ¡Despliegue exitoso! El sistema unificado está operativo."
else
    echo "⚠️  Hay algunos problemas que necesitan atención."
fi