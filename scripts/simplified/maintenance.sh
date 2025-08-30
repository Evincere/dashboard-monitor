#!/bin/bash

# Dashboard Monitor - Maintenance Script
# Uso: ./maintenance.sh [logs|restart|status|cleanup]

set -e

PROJECT_DIR="/home/semper/dashboard-monitor"
cd "$PROJECT_DIR"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Función para mostrar logs
show_logs() {
    echo -e "${BLUE}=== Logs del Sistema ===${NC}"
    echo
    echo -e "${YELLOW}Logs de Producción:${NC}"
    pm2 logs dashboard-monitor --lines 20 --nostream
    echo
    echo -e "${YELLOW}Logs de Desarrollo:${NC}"
    pm2 logs dashboard-monitor-dev --lines 20 --nostream 2>/dev/null || echo "Servicio de desarrollo no está corriendo"
    echo
    echo -e "${YELLOW}Logs de Nginx:${NC}"
    sudo tail -20 /var/log/nginx/error.log
}

# Función para reiniciar servicios
restart_services() {
    echo -e "${BLUE}=== Reiniciando Servicios ===${NC}"
    
    echo "Reiniciando PM2..."
    pm2 restart all
    
    echo "Recargando Nginx..."
    sudo systemctl reload nginx
    
    echo -e "${GREEN}✓ Servicios reiniciados${NC}"
}

# Función para mostrar estado del sistema
show_system_status() {
    echo -e "${BLUE}=== Estado del Sistema ===${NC}"
    echo
    
    echo -e "${YELLOW}Servicios PM2:${NC}"
    pm2 list
    echo
    
    echo -e "${YELLOW}Estado de Nginx:${NC}"
    sudo systemctl status nginx --no-pager -l
    echo
    
    echo -e "${YELLOW}Uso de disco:${NC}"
    df -h "$PROJECT_DIR"
    echo
    
    echo -e "${YELLOW}Memoria libre:${NC}"
    free -h
    echo
    
    echo -e "${YELLOW}Conexiones actuales:${NC}"
    netstat -tlnp | grep -E ":(80|443|9002|9003|3003)" | head -10
}

# Función para limpiar archivos temporales
cleanup() {
    echo -e "${BLUE}=== Limpieza del Sistema ===${NC}"
    
    # Limpiar logs antiguos de PM2
    echo "Limpiando logs de PM2..."
    pm2 flush
    
    # Limpiar archivos de build antiguos
    echo "Limpiando builds antiguos..."
    rm -rf .next/cache 2>/dev/null || true
    
    # Limpiar node_modules cache
    echo "Limpiando cache de npm..."
    npm cache clean --force 2>/dev/null || true
    
    # Limpiar logs de sistema antiguos (más de 7 días)
    echo "Limpiando logs antiguos..."
    find ./logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    echo -e "${GREEN}✓ Limpieza completada${NC}"
}

# Función de ayuda
show_help() {
    echo "Dashboard Monitor - Maintenance Script"
    echo
    echo "Uso: $0 [COMMAND]"
    echo
    echo "Comandos disponibles:"
    echo "  logs       Muestra logs recientes del sistema"
    echo "  restart    Reinicia todos los servicios"
    echo "  status     Muestra estado completo del sistema"
    echo "  cleanup    Limpia archivos temporales y cache"
    echo "  help       Muestra esta ayuda"
}

# Procesar argumentos
case "${1:-help}" in
    "logs")
        show_logs
        ;;
    "restart")
        restart_services
        ;;
    "status")
        show_system_status
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|*)
        show_help
        ;;
esac
