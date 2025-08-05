#!/bin/bash

echo "🔍 Verificando configuración actual de Nginx..."

# Verificar si nginx está instalado
if ! command -v nginx &> /dev/null; then
    echo "❌ Nginx no está instalado"
    exit 1
fi

# Verificar si nginx está funcionando
if ! systemctl is-active --quiet nginx; then
    echo "⚠️  Nginx no está funcionando"
    echo "💡 Para iniciarlo: sudo systemctl start nginx"
else
    echo "✅ Nginx está funcionando"
fi

# Mostrar configuración actual
echo ""
echo "📋 Configuraciones de Nginx encontradas:"
find /etc/nginx -name "*.conf" -type f | head -10

echo ""
echo "🔍 Buscando configuraciones relacionadas con dashboard:"
grep -r "dashboard" /etc/nginx/ 2>/dev/null || echo "No se encontraron configuraciones de dashboard"

echo ""
echo "🌐 Puertos en uso:"
netstat -tlnp | grep :80 || echo "Puerto 80 no está en uso"
netstat -tlnp | grep :443 || echo "Puerto 443 no está en uso"
netstat -tlnp | grep :9002 || echo "Puerto 9002 no está en uso"

echo ""
echo "📊 Estado de servicios web:"
systemctl is-active nginx 2>/dev/null && echo "✅ Nginx: activo" || echo "❌ Nginx: inactivo"
systemctl is-active apache2 2>/dev/null && echo "✅ Apache: activo" || echo "❌ Apache: inactivo"

echo ""
echo "💡 Para aplicar la nueva configuración:"
echo "   1. Copia nginx/dashboard-monitor.conf a /etc/nginx/sites-available/"
echo "   2. Crea un enlace simbólico: sudo ln -s /etc/nginx/sites-available/dashboard-monitor.conf /etc/nginx/sites-enabled/"
echo "   3. Prueba la configuración: sudo nginx -t"
echo "   4. Recarga nginx: sudo systemctl reload nginx"