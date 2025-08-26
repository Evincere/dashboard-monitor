#!/bin/bash

# ================================================
# DASHBOARD MONITOR MANAGEMENT SCRIPT - V2.0
# ================================================
# Gestión completa del microservicio dashboard-monitor
# Incluye manejo de servidor standalone, ChunkLoadError,
# builds limpios y troubleshooting automatizado

set -e  # Exit on any error

# Colors para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuraciones
PROJECT_DIR="/home/semper/dashboard-monitor"
APP_NAME="dashboard-monitor"
PORT="9002"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# =====================================
# UTILITY FUNCTIONS
# =====================================

check_dependencies() {
    log "Verificando dependencias del sistema..."
    
    commands=("node" "npm" "pm2" "curl" "git")
    for cmd in "${commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            error "$cmd no está instalado"
            exit 1
        fi
        info "✅ $cmd está disponible"
    done
}

check_project_structure() {
    log "Verificando estructura del proyecto..."
    
    if [ ! -d "$PROJECT_DIR" ]; then
        error "Directorio del proyecto no encontrado: $PROJECT_DIR"
        exit 1
    fi
    
    cd "$PROJECT_DIR"
    
    required_files=("package.json" "next.config.ts" "src" "ecosystem.config.js")
    for file in "${required_files[@]}"; do
        if [ ! -e "$file" ]; then
            error "Archivo/directorio requerido no encontrado: $file"
            exit 1
        fi
        info "✅ $file existe"
    done
}

check_build_config() {
    log "Verificando configuración de build..."
    
    # Verificar que next.config.ts tenga output: standalone
    if grep -q "output: 'standalone'" next.config.ts; then
        info "✅ Configuración standalone encontrada"
    else
        warning "⚠️  Configuración standalone no encontrada - puede causar problemas"
    fi
    
    # Verificar que ecosystem.config.js use el servidor standalone
    if grep -q ".next/standalone/server.js" ecosystem.config.js; then
        info "✅ PM2 configurado para servidor standalone"
    else
        warning "⚠️  PM2 no está configurado para servidor standalone"
    fi
}

# =====================================
# BUILD FUNCTIONS
# =====================================

clean_build() {
    log "Ejecutando build limpio..."
    
    info "🧹 Eliminando archivos de build anteriores..."
    rm -rf .next 2>/dev/null || true
    rm -rf node_modules/.cache 2>/dev/null || true
    
    info "📦 Instalando dependencias frescas..."
    npm ci --prefer-offline --no-audit
    
    info "🔨 Ejecutando build completo..."
    npm run build
    
    # Verificar que el build standalone se generó correctamente
    if [ ! -f ".next/standalone/server.js" ]; then
        error "❌ Build standalone no se generó correctamente"
        error "   Verifique que next.config.ts tenga: output: 'standalone'"
        exit 1
    fi
    
    if [ ! -d ".next/static" ]; then
        error "❌ Archivos estáticos no se generaron"
        exit 1
    fi
    
    info "✅ Build standalone generado correctamente"
}

quick_build() {
    log "Ejecutando build rápido..."
    
    info "🔨 Ejecutando build..."
    npm run build
    
    if [ ! -f ".next/standalone/server.js" ]; then
        warning "⚠️  Build standalone no se generó - ejecutando build limpio..."
        clean_build
        return
    fi
    
    info "✅ Build rápido completado"
}

# =====================================
# PM2 MANAGEMENT FUNCTIONS
# =====================================

pm2_status() {
    log "Estado actual de PM2:"
    pm2 status $APP_NAME 2>/dev/null || info "Aplicación no está registrada en PM2"
}

pm2_start() {
    log "Iniciando aplicación con PM2..."
    
    # Detener si está corriendo
    pm2 stop $APP_NAME 2>/dev/null || true
    
    # Eliminar de PM2 si existe
    pm2 delete $APP_NAME 2>/dev/null || true
    
    # Iniciar con nueva configuración
    pm2 start ecosystem.config.js
    
    info "✅ Aplicación iniciada"
}

pm2_restart() {
    log "Reiniciando aplicación..."
    
    if pm2 status $APP_NAME &>/dev/null; then
        pm2 restart $APP_NAME
        info "✅ Aplicación reiniciada"
    else
        warning "Aplicación no está corriendo, iniciando..."
        pm2_start
    fi
}

pm2_stop() {
    log "Deteniendo aplicación..."
    pm2 stop $APP_NAME 2>/dev/null || info "Aplicación ya estaba detenida"
    info "✅ Aplicación detenida"
}

pm2_logs() {
    log "Mostrando logs recientes..."
    pm2 logs $APP_NAME --lines 50
}

# =====================================
# HEALTH CHECK FUNCTIONS  
# =====================================

health_check() {
    log "Ejecutando verificación de salud..."
    
    local retries=0
    local max_retries=30
    local base_url="http://localhost:$PORT/dashboard-monitor"
    
    info "Esperando que el servidor esté listo..."
    while [ $retries -lt $max_retries ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$base_url" | grep -q "200\|308"; then
            break
        fi
        
        retries=$((retries + 1))
        info "Intento $retries/$max_retries - esperando..."
        sleep 2
    done
    
    if [ $retries -eq $max_retries ]; then
        error "❌ Servidor no responde después de $max_retries intentos"
        return 1
    fi
    
    info "🩺 Verificando endpoints críticos..."
    
    # Test principales endpoints
    endpoints=(
        "/dashboard-monitor"
        "/dashboard-monitor/reportes" 
        "/dashboard-monitor/api/reports/dashboard/metrics"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local url="http://localhost:$PORT$endpoint"
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
        
        if [[ "$status_code" =~ ^(200|308)$ ]]; then
            info "✅ $endpoint - HTTP $status_code"
        else
            error "❌ $endpoint - HTTP $status_code"
        fi
    done
    
    log "✅ Verificación de salud completada"
}

# =====================================
# TROUBLESHOOTING FUNCTIONS
# =====================================

diagnose_issues() {
    log "🔍 Ejecutando diagnóstico de problemas comunes..."
    
    info "Verificando PM2 status..."
    pm2 status $APP_NAME || true
    
    info "Verificando logs de errores recientes..."
    pm2 logs $APP_NAME --err --lines 10 || true
    
    info "Verificando archivos de build..."
    if [ ! -f ".next/standalone/server.js" ]; then
        error "❌ Servidor standalone no encontrado"
        warning "   Solución: ejecutar '$0 build-clean'"
    else
        info "✅ Servidor standalone existe"
    fi
    
    if [ ! -d ".next/static" ]; then
        error "❌ Archivos estáticos no encontrados"
        warning "   Solución: ejecutar '$0 build-clean'"
    else
        info "✅ Archivos estáticos existen"
    fi
    
    info "Verificando puerto $PORT..."
    if netstat -tulpn 2>/dev/null | grep ":$PORT " >/dev/null; then
        info "✅ Puerto $PORT está en uso"
        netstat -tulpn 2>/dev/null | grep ":$PORT "
    else
        error "❌ Puerto $PORT no está en uso"
    fi
    
    info "Verificando configuración Next.js..."
    if grep -q "basePath: '/dashboard-monitor'" next.config.ts; then
        info "✅ basePath configurado correctamente"
    else
        warning "⚠️  basePath puede no estar configurado correctamente"
    fi
}

fix_chunk_errors() {
    log "🔧 Corrigiendo ChunkLoadError y problemas de assets..."
    
    info "Deteniendo servidor..."
    pm2_stop
    
    info "Ejecutando build limpio..."
    clean_build
    
    info "Reiniciando servidor..."
    pm2_start
    
    info "Verificando corrección..."
    sleep 10
    health_check
}

# =====================================
# GIT FUNCTIONS
# =====================================

git_status() {
    log "Estado de Git:"
    git status --short
    
    log "Branch actual:"
    git branch --show-current
    
    log "Último commit:"
    git log -1 --oneline
}

git_pull() {
    log "Actualizando desde repositorio remoto..."
    git pull origin $(git branch --show-current)
    info "✅ Código actualizado"
}

# =====================================
# MAIN COMMAND HANDLER
# =====================================

show_help() {
    echo -e "${CYAN}Dashboard Monitor Management Script v2.0${NC}"
    echo ""
    echo -e "${YELLOW}COMANDOS DISPONIBLES:${NC}"
    echo ""
    echo -e "${GREEN}📋 INFORMACIÓN:${NC}"
    echo "  status         - Mostrar estado completo del sistema"
    echo "  logs           - Mostrar logs recientes"
    echo "  health         - Verificación de salud completa"
    echo "  diagnose       - Diagnosticar problemas comunes"
    echo ""
    echo -e "${GREEN}🔧 GESTIÓN:${NC}"
    echo "  start          - Iniciar aplicación"
    echo "  stop           - Detener aplicación" 
    echo "  restart        - Reiniciar aplicación"
    echo "  reload         - Reload completo (pull + build + restart)"
    echo ""
    echo -e "${GREEN}🔨 BUILD:${NC}"
    echo "  build          - Build rápido"
    echo "  build-clean    - Build limpio completo"
    echo "  fix-chunks     - Corregir ChunkLoadError"
    echo ""
    echo -e "${GREEN}📂 GIT:${NC}"
    echo "  git-status     - Estado de Git"
    echo "  git-pull       - Actualizar desde remoto"
    echo ""
    echo -e "${YELLOW}EJEMPLOS:${NC}"
    echo "  ./manage-dashboard-monitor.sh status"
    echo "  ./manage-dashboard-monitor.sh build-clean"
    echo "  ./manage-dashboard-monitor.sh fix-chunks"
    echo "  ./manage-dashboard-monitor.sh reload"
}

main() {
    case "$1" in
        "status")
            check_dependencies
            check_project_structure
            check_build_config
            pm2_status
            ;;
        "start")
            check_dependencies
            check_project_structure
            pm2_start
            health_check
            ;;
        "stop")
            pm2_stop
            ;;
        "restart")
            pm2_restart
            health_check
            ;;
        "reload")
            check_dependencies
            check_project_structure
            git_pull
            clean_build
            pm2_start
            health_check
            ;;
        "build")
            check_dependencies
            check_project_structure
            quick_build
            ;;
        "build-clean")
            check_dependencies
            check_project_structure
            clean_build
            ;;
        "fix-chunks")
            check_dependencies
            check_project_structure
            fix_chunk_errors
            ;;
        "health")
            health_check
            ;;
        "logs")
            pm2_logs
            ;;
        "diagnose")
            check_dependencies
            check_project_structure
            diagnose_issues
            ;;
        "git-status")
            git_status
            ;;
        "git-pull")
            git_pull
            ;;
        "help"|"-h"|"--help"|"")
            show_help
            ;;
        *)
            error "Comando desconocido: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Change to project directory
cd "$PROJECT_DIR"

# Run main function
main "$@"
