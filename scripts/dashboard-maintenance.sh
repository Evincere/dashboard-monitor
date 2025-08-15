#!/bin/bash

# =============================================================================
# Script de Mantenimiento para Dashboard Monitor
# =============================================================================

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "============================================================================="
echo "🔧 DASHBOARD MONITOR - MANTENIMIENTO"
echo "============================================================================="
echo ""

# Función para mostrar estado
show_status() {
    log "Estado actual del Dashboard Monitor:"
    pm2 status dashboard-monitor
    echo ""
    
    log "Uso de memoria y CPU:"
    pm2 monit --no-daemon | head -10
    echo ""
    
    log "Últimas líneas del log:"
    pm2 logs dashboard-monitor --lines 5 --nostream
}

# Función para reiniciar
restart_dashboard() {
    log "Reiniciando Dashboard Monitor..."
    pm2 restart dashboard-monitor
    sleep 5
    
    if pm2 status dashboard-monitor | grep -q "online"; then
        success "Dashboard reiniciado correctamente"
    else
        error "Error al reiniciar el dashboard"
        return 1
    fi
}

# Función para actualizar
update_dashboard() {
    log "Actualizando Dashboard Monitor..."
    
    # Backup de configuración
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    success "Backup de configuración creado"
    
    # Pull de cambios (si hay git)
    if [ -d ".git" ]; then
        git pull origin main
        success "Código actualizado desde repositorio"
    fi
    
    # Instalar dependencias
    npm ci
    success "Dependencias actualizadas"
    
    # Build
    npm run build
    success "Build completado"
    
    # Reiniciar
    restart_dashboard
}

# Función para limpiar logs
clean_logs() {
    log "Limpiando logs antiguos..."
    
    # Limpiar logs de PM2
    pm2 flush dashboard-monitor
    
    # Limpiar archivos de log antiguos (más de 7 días)
    find logs/ -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    success "Logs limpiados"
}

# Función para backup
backup_dashboard() {
    log "Creando backup del dashboard..."
    
    BACKUP_DIR="backups/dashboard_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup de configuración
    cp .env "$BACKUP_DIR/"
    cp ecosystem.config.js "$BACKUP_DIR/"
    cp package.json "$BACKUP_DIR/"
    
    # Backup de logs importantes
    cp -r logs/ "$BACKUP_DIR/" 2>/dev/null || true
    
    success "Backup creado en $BACKUP_DIR"
}

# Función para health check
health_check() {
    log "Ejecutando health check..."
    
    if ./scripts/health-check.sh localhost 9002; then
        success "Health check pasó correctamente"
    else
        warning "Health check falló - revisar logs"
        pm2 logs dashboard-monitor --lines 10 --nostream
    fi
}

# Menú principal
case "$1" in
    "status")
        show_status
        ;;
    "restart")
        restart_dashboard
        ;;
    "update")
        update_dashboard
        ;;
    "clean")
        clean_logs
        ;;
    "backup")
        backup_dashboard
        ;;
    "health")
        health_check
        ;;
    "all")
        log "Ejecutando mantenimiento completo..."
        backup_dashboard
        clean_logs
        health_check
        show_status
        ;;
    *)
        echo "Uso: $0 {status|restart|update|clean|backup|health|all}"
        echo ""
        echo "Comandos disponibles:"
        echo "  status  - Mostrar estado actual"
        echo "  restart - Reiniciar dashboard"
        echo "  update  - Actualizar y reiniciar"
        echo "  clean   - Limpiar logs antiguos"
        echo "  backup  - Crear backup de configuración"
        echo "  health  - Ejecutar health check"
        echo "  all     - Mantenimiento completo"
        exit 1
        ;;
esac