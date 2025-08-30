#!/bin/bash

# Dashboard Monitor - Environment Switcher
# Uso: ./switch-environment.sh [production|development|status]

set -e

PROJECT_DIR="/home/semper/dashboard-monitor"
cd "$PROJECT_DIR"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar estado actual
show_status() {
    echo -e "${BLUE}=== Estado Actual de Dashboard Monitor ===${NC}"
    echo
    
    # Estado de PM2
    echo -e "${YELLOW}Servicios PM2:${NC}"
    pm2 list
    echo
    
    # Puertos en uso
    echo -e "${YELLOW}Puertos en uso:${NC}"
    netstat -tlnp | grep -E ":(9002|9003|3003)" | grep -v "127.0.0.1"
    echo
    
    # Branch actual
    echo -e "${YELLOW}Branch actual:${NC}"
    git branch --show-current
    echo
    
    # Último commit
    echo -e "${YELLOW}Último commit:${NC}"
    git log --oneline -1
    echo
    
    # URLs de acceso
    echo -e "${YELLOW}URLs de acceso:${NC}"
    echo "Producción: https://vps-4778464-x.dattaweb.com/dashboard-monitor"
    echo "Desarrollo: https://vps-4778464-x.dattaweb.com:9003/dashboard-monitor"
}

# Función para desplegar a producción
deploy_production() {
    echo -e "${GREEN}=== Desplegando a Producción ===${NC}"
    
    # Verificar que estemos en main
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "main" ]; then
        echo -e "${RED}Error: Debes estar en la rama 'main' para desplegar a producción${NC}"
        echo "Rama actual: $CURRENT_BRANCH"
        exit 1
    fi
    
    # Pull latest changes
    echo "Actualizando código..."
    git pull origin main
    
    # Install dependencies
    echo "Instalando dependencias..."
    npm install
    
    # Build production
    echo "Construyendo aplicación..."
    npm run build
    
    # Restart production service
    echo "Reiniciando servicio de producción..."
    pm2 restart dashboard-monitor
    
    echo -e "${GREEN}✓ Producción actualizada correctamente${NC}"
    echo "Acceso: https://vps-4778464-x.dattaweb.com/dashboard-monitor"
}

# Función para configurar desarrollo
setup_development() {
    echo -e "${GREEN}=== Configurando Entorno de Desarrollo ===${NC}"
    
    # Mostrar branch actual
    CURRENT_BRANCH=$(git branch --show-current)
    echo "Branch actual: $CURRENT_BRANCH"
    
    if [ "$CURRENT_BRANCH" == "main" ]; then
        echo -e "${YELLOW}Advertencia: Estás en 'main'. ¿Quieres crear una nueva rama de feature?${NC}"
        echo "Presiona Enter para continuar en main, o Ctrl+C para cancelar"
        read
    fi
    
    # Install dependencies
    echo "Instalando dependencias..."
    npm install
    
    # Restart development service
    echo "Reiniciando servicio de desarrollo..."
    pm2 restart dashboard-monitor-dev || {
        echo "Creando servicio de desarrollo..."
        PORT=3003 NODE_ENV=development pm2 start npm --name "dashboard-monitor-dev" -- run dev
    }
    
    # Save PM2 configuration
    pm2 save
    
    echo -e "${GREEN}✓ Entorno de desarrollo configurado${NC}"
    echo "Acceso: https://vps-4778464-x.dattaweb.com:9003/dashboard-monitor"
}

# Función para crear nueva rama de feature
create_feature_branch() {
    echo -e "${BLUE}=== Crear Nueva Rama de Feature ===${NC}"
    
    # Verificar que estemos en main y actualizado
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "main" ]; then
        echo -e "${YELLOW}Cambiando a main...${NC}"
        git checkout main
    fi
    
    git pull origin main
    
    echo "Ingresa el nombre de la nueva feature (ej: sidebar-improvements):"
    read FEATURE_NAME
    
    if [ -z "$FEATURE_NAME" ]; then
        echo -e "${RED}Error: Nombre de feature requerido${NC}"
        exit 1
    fi
    
    BRANCH_NAME="feature/$FEATURE_NAME"
    
    echo "Creando rama: $BRANCH_NAME"
    git checkout -b "$BRANCH_NAME"
    
    echo -e "${GREEN}✓ Rama '$BRANCH_NAME' creada y activa${NC}"
    
    # Setup development environment
    setup_development
}

# Función de ayuda
show_help() {
    echo "Dashboard Monitor - Environment Switcher"
    echo
    echo "Uso: $0 [COMMAND]"
    echo
    echo "Comandos disponibles:"
    echo "  production     Despliega a producción (requiere estar en main)"
    echo "  development    Configura entorno de desarrollo"
    echo "  feature        Crea nueva rama de feature y configura desarrollo"
    echo "  status         Muestra estado actual del sistema"
    echo "  help           Muestra esta ayuda"
    echo
    echo "URLs de acceso:"
    echo "  Producción:  https://vps-4778464-x.dattaweb.com/dashboard-monitor"
    echo "  Desarrollo:  https://vps-4778464-x.dattaweb.com:9003/dashboard-monitor"
}

# Procesar argumentos
case "${1:-help}" in
    "production")
        deploy_production
        ;;
    "development")
        setup_development
        ;;
    "feature")
        create_feature_branch
        ;;
    "status")
        show_status
        ;;
    "help"|*)
        show_help
        ;;
esac
