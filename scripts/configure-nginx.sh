#!/bin/bash

echo "🔧 Configuración simple de nginx que funciona con Next.js..."

# Backup
sudo cp /etc/nginx/sites-available/mpd-concursos /etc/nginx/sites-available/mpd-concursos.backup.simple-working.$(date +%Y%m%d_%H%M%S)

# Remover configuraciones existentes de dashboard-monitor
sudo sed -i '/# Dashboard Monitor/,/^    }/d' /etc/nginx/sites-available/mpd-concursos
sudo sed -i '/location.*dashboard-monitor/,/^    }/d' /etc/nginx/sites-available/mpd-concursos

# Agregar configuración simple que funciona
sudo sed -i '/^}/i \
    # Dashboard Monitor - Configuración simple que funciona\
    location /dashboard-monitor {\
        proxy_pass http://localhost:9002;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection '\''upgrade'\'';\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_cache_bypass $http_upgrade;\
        proxy_set_header X-Forwarded-Host $host;\
        proxy_set_header X-Forwarded-Server $host;\
        proxy_connect_timeout 60s;\
        proxy_send_timeout 60s;\
        proxy_read_timeout 60s;\
        proxy_buffering on;\
        proxy_buffer_size 4k;\
        proxy_buffers 8 4k;\
    }\
' /etc/nginx/sites-available/mpd-concursos

# Aplicar cambios
sudo cp /etc/nginx/sites-available/mpd-concursos /etc/nginx/sites-enabled/mpd-concursos

# Probar configuración
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "✅ Configuración simple aplicada exitosamente"
    echo ""
    echo "🌐 Probando rutas:"
    echo -n "   - /dashboard-monitor (sin barra): "
    curl -s -o /dev/null -w "%{http_code}\n" https://vps-4778464-x.dattaweb.com/dashboard-monitor
    echo -n "   - /dashboard-monitor/ (con barra): "
    curl -s -o /dev/null -w "%{http_code}\n" https://vps-4778464-x.dattaweb.com/dashboard-monitor/
    echo -n "   - Unified Query: "
    curl -s -o /dev/null -w "%{http_code}\n" https://vps-4778464-x.dattaweb.com/dashboard-monitor/unified-query
    echo -n "   - API Health: "
    curl -s -o /dev/null -w "%{http_code}\n" https://vps-4778464-x.dattaweb.com/dashboard-monitor/api/health
    echo ""
    echo "🎯 Usa https://vps-4778464-x.dattaweb.com/dashboard-monitor (sin barra final)"
    echo "   Next.js manejará las redirecciones internamente"
else
    echo "❌ Error en configuración"
    exit 1
fi