#!/bin/bash

echo "🔧 Agregando configuración de Dashboard Monitor a nginx..."

# Verificar permisos de sudo
if ! sudo -n true 2>/dev/null; then
    echo "❌ Se requieren permisos de sudo para actualizar nginx"
    exit 1
fi

# Backup de la configuración actual
echo "📋 Creando backup de la configuración actual..."
sudo cp /etc/nginx/sites-available/mpd-concursos /etc/nginx/sites-available/mpd-concursos.backup.$(date +%Y%m%d_%H%M%S)

# Verificar si ya existe la configuración de dashboard-monitor
if sudo grep -q "location /dashboard-monitor/" /etc/nginx/sites-available/mpd-concursos; then
    echo "⚠️  La configuración de /dashboard-monitor/ ya existe"
    echo "🔄 Actualizando configuración existente..."
    
    # Actualizar la configuración existente
    sudo sed -i 's|proxy_pass http://localhost:[0-9]*/dashboard-monitor/;|proxy_pass http://localhost:9002/;|g' /etc/nginx/sites-available/mpd-concursos
else
    echo "➕ Agregando nueva configuración de /dashboard-monitor/"
    
    # Agregar la nueva configuración antes del cierre del server block
    sudo sed -i '/^}/i \
    # Dashboard Monitor - MPD Insights\
    location /dashboard-monitor/ {\
        proxy_pass http://localhost:9002/;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection '\''upgrade'\'';\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_cache_bypass $http_upgrade;\
        \
        # Headers adicionales para Next.js\
        proxy_set_header X-Forwarded-Host $host;\
        proxy_set_header X-Forwarded-Server $host;\
        \
        # Timeouts para consultas de IA\
        proxy_connect_timeout 60s;\
        proxy_send_timeout 60s;\
        proxy_read_timeout 60s;\
    }\
    \
    # Dashboard Monitor API\
    location /dashboard-monitor/api/ {\
        proxy_pass http://localhost:9002/dashboard-monitor/api/;\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        \
        # Timeouts extendidos para APIs de IA\
        proxy_connect_timeout 120s;\
        proxy_send_timeout 120s;\
        proxy_read_timeout 120s;\
    }\
    \
    # Dashboard Monitor archivos estáticos\
    location /dashboard-monitor/_next/ {\
        proxy_pass http://localhost:9002/dashboard-monitor/_next/;\
        expires 1y;\
        add_header Cache-Control "public, immutable";\
        proxy_set_header Host $host;\
        proxy_set_header X-Forwarded-Proto $scheme;\
    }\
' /etc/nginx/sites-available/mpd-concursos
fi

# Aplicar los mismos cambios al archivo en sites-enabled
sudo cp /etc/nginx/sites-available/mpd-concursos /etc/nginx/sites-enabled/mpd-concursos

# Verificar que el cambio se aplicó
echo "🔍 Verificando cambios..."
if sudo grep -q "location /dashboard-monitor/" /etc/nginx/sites-available/mpd-concursos; then
    echo "✅ Configuración agregada correctamente"
else
    echo "❌ Error al agregar la configuración"
    exit 1
fi

# Probar la configuración de nginx
echo "🧪 Probando configuración de nginx..."
if sudo nginx -t; then
    echo "✅ Configuración de nginx válida"
    
    # Recargar nginx
    echo "🔄 Recargando nginx..."
    if sudo systemctl reload nginx; then
        echo "✅ Nginx recargado exitosamente"
        echo ""
        echo "🌐 Dashboard Monitor ahora disponible en:"
        echo "   https://vps-4778464-x.dattaweb.com/dashboard-monitor/"
        echo ""
        echo "🔍 Para verificar: curl -s https://vps-4778464-x.dattaweb.com/dashboard-monitor/api/health"
    else
        echo "❌ Error al recargar nginx"
        exit 1
    fi
else
    echo "❌ Error en la configuración de nginx"
    echo "💡 Restaurando backup..."
    sudo cp /etc/nginx/sites-available/mpd-concursos.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/mpd-concursos
    exit 1
fi