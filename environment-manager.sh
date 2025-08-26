#!/bin/bash

# ================================================
# ENVIRONMENT MANAGER - Dashboard Monitor
# ================================================
# Gestión segura de entornos de desarrollo y producción

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $1"; }
warning() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $1"; }
info() { echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO:${NC} $1"; }

# Funciones principales
production_mode() {
    log "🚀 Activando MODO PRODUCCIÓN..."
    
    # Verificar rama
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "production-stable" ]; then
        warning "Cambiando a rama production-stable..."
        git checkout production-stable
    fi
    
    # Parar servicios de desarrollo
    pm2 stop dashboard-monitor-dev 2>/dev/null || true
    
    # Usar configuración de producción
    cp .env.production .env
    
    # Reiniciar servicio de producción
    pm2 reload ecosystem.production.config.js || pm2 start ecosystem.production.config.js
    
    log "✅ PRODUCCIÓN ACTIVA en puerto 9002"
    log "📊 Monitoreo: pm2 monit"
    log "📝 Logs: pm2 logs dashboard-monitor"
}

development_mode() {
    log "🔧 Activando MODO DESARROLLO..."
    
    # Cambiar a rama de desarrollo
    current_branch=$(git branch --show-current)
    if [ "$current_branch" == "production-stable" ]; then
        git checkout feature/reportes-administrativos
    fi
    
    # Parar servicios de producción
    pm2 stop dashboard-monitor 2>/dev/null || true
    
    # Usar configuración de desarrollo
    cp .env.development .env
    
    # Iniciar servicio de desarrollo
    pm2 reload ecosystem.development.config.js || pm2 start ecosystem.development.config.js
    
    log "✅ DESARROLLO ACTIVO en puerto 9003"
    log "📊 Monitoreo: pm2 monit"
    log "📝 Logs: pm2 logs dashboard-monitor-dev"
}

status() {
    log "📊 ESTADO DE SERVICIOS:"
    pm2 status
    echo ""
    
    log "🌿 Rama actual: $(git branch --show-current)"
    log "⚙️  Archivo .env activo: $(head -1 .env 2>/dev/null || echo 'Sin configurar')"
    
    echo ""
    log "🌐 Pruebas de conectividad:"
    echo "Producción (9002): $(curl -s -o /dev/null -w '%{http_code}' http://localhost:9002/dashboard-monitor/ || echo 'OFF')"
    echo "Desarrollo (9003): $(curl -s -o /dev/null -w '%{http_code}' http://localhost:9003/dashboard-monitor/ || echo 'OFF')"
}

safe_deploy() {
    log "🚀 DEPLOY SEGURO A PRODUCCIÓN..."
    
    # Verificaciones previas
    if [ "$(git branch --show-current)" != "production-stable" ]; then
        error "Deploy solo desde rama production-stable"
        exit 1
    fi
    
    if [ -n "$(git status --porcelain)" ]; then
        error "Hay cambios sin commit. Commit primero."
        git status
        exit 1
    fi
    
    # Backup pre-deploy
    backup_dir="backups/deploy-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    cp -r .next "$backup_dir/" 2>/dev/null || true
    
    log "💾 Backup creado en $backup_dir"
    
    # Pull y build
    git pull origin production-stable
    npm run build
    
    # Deploy
    production_mode
    
    # Health check
    sleep 5
    if curl -s http://localhost:9002/dashboard-monitor/ > /dev/null; then
        log "✅ Deploy exitoso - Servicio respondiendo"
    else
        error "❌ Deploy falló - Servicio no responde"
        exit 1
    fi
}

# Comando principal
case "${1}" in
    "prod"|"production")
        production_mode
        ;;
    "dev"|"development")
        development_mode
        ;;
    "status"|"st")
        status
        ;;
    "deploy")
        safe_deploy
        ;;
    *)
        echo "Uso: $0 {prod|dev|status|deploy}"
        echo ""
        echo "Comandos:"
        echo "  prod, production  - Activar modo producción (puerto 9002)"
        echo "  dev, development  - Activar modo desarrollo (puerto 9003)"
        echo "  status, st        - Ver estado de servicios"
        echo "  deploy            - Deploy seguro a producción"
        exit 1
        ;;
esac
