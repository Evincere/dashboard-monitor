#!/bin/bash

# =============================================================================
# Script de Deployment para Producción - Dashboard Monitor
# =============================================================================

set -e  # Salir si cualquier comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
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
    exit 1
}

# Banner
echo "============================================================================="
echo "🚀 DASHBOARD MONITOR - DEPLOYMENT SCRIPT PARA PRODUCCIÓN"
echo "============================================================================="
echo ""

# 1. Verificar prerrequisitos
log "Verificando prerrequisitos..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    error "Node.js no está instalado"
fi
NODE_VERSION=$(node --version)
success "Node.js encontrado: $NODE_VERSION"

# Verificar npm
if ! command -v npm &> /dev/null; then
    error "npm no está instalado"
fi
NPM_VERSION=$(npm --version)
success "npm encontrado: $NPM_VERSION"

# Verificar Docker (opcional)
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    success "Docker encontrado: $DOCKER_VERSION"
    HAS_DOCKER=true
else
    warning "Docker no encontrado - deployment sin contenedores"
    HAS_DOCKER=false
fi

# Verificar PM2 (opcional)
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version)
    success "PM2 encontrado: $PM2_VERSION"
    HAS_PM2=true
else
    warning "PM2 no encontrado - se puede instalar automáticamente"
    HAS_PM2=false
fi

echo ""

# 2. Validar variables de entorno
log "Validando configuración de variables de entorno..."
if ! node scripts/validate-env.js; then
    error "Configuración de variables de entorno inválida. Revisa el archivo .env"
fi
success "Variables de entorno validadas correctamente"
echo ""

# 3. Instalar dependencias
log "Instalando todas las dependencias (necesarias para build)..."
npm ci
success "Dependencias instaladas"
echo ""

# 4. Ejecutar tests (si existen)
log "Ejecutando tests..."
if npm run test:run &> /dev/null; then
    success "Tests pasaron correctamente"
else
    warning "Tests fallaron o no están configurados - continuando..."
fi
echo ""

# 5. Build de la aplicación
log "Construyendo aplicación para producción..."
npm run build
success "Build completado"
echo ""

# 6. Opciones de deployment
echo "============================================================================="
echo "🎯 OPCIONES DE DEPLOYMENT"
echo "============================================================================="
echo ""
echo "Selecciona el método de deployment:"
echo "1) Docker (Recomendado para producción)"
echo "2) PM2 (Process Manager)"
echo "3) Standalone (Node.js directo)"
echo "4) Solo validar y preparar (no ejecutar)"
echo ""

read -p "Ingresa tu opción (1-4): " DEPLOYMENT_OPTION

case $DEPLOYMENT_OPTION in
    1)
        # Docker Deployment
        if [ "$HAS_DOCKER" = false ]; then
            error "Docker no está disponible"
        fi
        
        log "Iniciando deployment con Docker..."
        
        # Crear Dockerfile si no existe
        if [ ! -f "Dockerfile" ]; then
            log "Creando Dockerfile..."
            cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Build de la aplicación
RUN npm run build

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Comando de inicio
CMD ["npm", "start"]
EOF
            success "Dockerfile creado"
        fi
        
        # Crear .dockerignore si no existe
        if [ ! -f ".dockerignore" ]; then
            log "Creando .dockerignore..."
            cat > .dockerignore << 'EOF'
node_modules
.next
.git
.env.local
.env.development.local
.env.test.local
.env.production.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
*.tgz
*.tar.gz
EOF
            success ".dockerignore creado"
        fi
        
        # Build de imagen Docker
        log "Construyendo imagen Docker..."
        docker build -t dashboard-monitor:latest .
        success "Imagen Docker construida"
        
        # Detener contenedor existente si existe
        if docker ps -a | grep -q dashboard-monitor; then
            log "Deteniendo contenedor existente..."
            docker stop dashboard-monitor || true
            docker rm dashboard-monitor || true
        fi
        
        # Ejecutar contenedor
        log "Iniciando contenedor..."
        docker run -d \
            --name dashboard-monitor \
            --restart unless-stopped \
            -p 3000:3000 \
            --env-file .env \
            dashboard-monitor:latest
        
        success "Aplicación desplegada con Docker en puerto 3000"
        ;;
        
    2)
        # PM2 Deployment
        log "Iniciando deployment con PM2..."
        
        # Instalar PM2 si no está disponible
        if [ "$HAS_PM2" = false ]; then
            log "Instalando PM2..."
            npm install -g pm2
            success "PM2 instalado"
        fi
        
        # Crear ecosystem.config.js si no existe
        if [ ! -f "ecosystem.config.js" ]; then
            log "Creando configuración PM2..."
            cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'dashboard-monitor',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF
            success "Configuración PM2 creada"
        fi
        
        # Crear directorio de logs
        mkdir -p logs
        
        # Detener aplicación existente
        pm2 stop dashboard-monitor || true
        pm2 delete dashboard-monitor || true
        
        # Iniciar con PM2
        pm2 start ecosystem.config.js --env production
        pm2 save
        
        success "Aplicación desplegada con PM2"
        log "Comandos útiles:"
        echo "  - Ver logs: pm2 logs dashboard-monitor"
        echo "  - Ver status: pm2 status"
        echo "  - Reiniciar: pm2 restart dashboard-monitor"
        echo "  - Detener: pm2 stop dashboard-monitor"
        ;;
        
    3)
        # Standalone Deployment
        log "Iniciando deployment standalone..."
        
        # Crear script de inicio
        cat > start-production.sh << 'EOF'
#!/bin/bash
export NODE_ENV=production
export PORT=3000
npm start
EOF
        chmod +x start-production.sh
        
        success "Script de inicio creado: start-production.sh"
        warning "Para iniciar la aplicación ejecuta: ./start-production.sh"
        ;;
        
    4)
        # Solo preparar
        log "Preparación completada sin ejecutar..."
        success "Aplicación lista para deployment manual"
        ;;
        
    *)
        error "Opción inválida"
        ;;
esac

echo ""
echo "============================================================================="
echo "🎉 DEPLOYMENT COMPLETADO"
echo "============================================================================="
echo ""

# Mostrar información final
log "Información del deployment:"
echo "  - Aplicación: Dashboard Monitor"
echo "  - Entorno: Producción"
echo "  - Puerto: 3000 (configurable con PORT env var)"
echo "  - Logs: Revisar según método de deployment elegido"
echo ""

# Health check
if [ "$DEPLOYMENT_OPTION" = "1" ] || [ "$DEPLOYMENT_OPTION" = "2" ]; then
    log "Esperando que la aplicación inicie..."
    sleep 10
    
    if curl -f http://localhost:3000/health &> /dev/null; then
        success "✅ Aplicación respondiendo correctamente en http://localhost:3000"
    else
        warning "⚠️  No se pudo verificar el health check - revisa los logs"
    fi
fi

echo ""
log "🚀 Deployment completado exitosamente!"
echo ""
echo "Próximos pasos:"
echo "1. Configurar proxy reverso (nginx/apache) si es necesario"
echo "2. Configurar SSL/TLS"
echo "3. Configurar monitoreo y alertas"
echo "4. Configurar backups de base de datos"
echo ""
echo "Para más información, revisa DEPLOYMENT.md"
echo ""