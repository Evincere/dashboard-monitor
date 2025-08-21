#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
APP_NAME="dashboard-monitor"
APP_PATH="/home/semper/dashboard-monitor"
PM2_PATH=$(which pm2)

# Functions
check_pm2() {
    if [ -z "$PM2_PATH" ]; then
        echo -e "${RED}PM2 no está instalado. Instalando...${NC}"
        npm install -g pm2
        PM2_PATH=$(which pm2)
    fi
}

show_status() {
    if [ -n "$PM2_PATH" ]; then
        echo -e "${YELLOW}Estado de PM2:${NC}"
        $PM2_PATH list | grep $APP_NAME
    else
        echo -e "${RED}PM2 no está instalado${NC}"
    fi
}

start_app() {
    check_pm2
    cd $APP_PATH
    echo -e "${GREEN}Iniciando $APP_NAME con PM2...${NC}"
    $PM2_PATH start ecosystem.config.js
    show_status
}

stop_app() {
    check_pm2
    echo -e "${YELLOW}Deteniendo $APP_NAME...${NC}"
    $PM2_PATH stop $APP_NAME
    show_status
}

restart_app() {
    check_pm2
    echo -e "${YELLOW}Reiniciando $APP_NAME...${NC}"
    $PM2_PATH restart $APP_NAME
    show_status
}

delete_app() {
    check_pm2
    echo -e "${RED}Eliminando $APP_NAME de PM2...${NC}"
    $PM2_PATH delete $APP_NAME
    show_status
}

show_logs() {
    check_pm2
    echo -e "${YELLOW}Mostrando logs de $APP_NAME...${NC}"
    $PM2_PATH logs $APP_NAME
}

case "$1" in
    "pm2")
        case "$2" in
            "start")
                start_app
                ;;
            "stop")
                stop_app
                ;;
            "restart")
                restart_app
                ;;
            "delete")
                delete_app
                ;;
            "status")
                show_status
                ;;
            "logs")
                show_logs
                ;;
            *)
                echo -e "${RED}Comando PM2 no válido. Uso: $0 pm2 {start|stop|restart|delete|status|logs}${NC}"
                exit 1
                ;;
        esac
        ;;
    *)
        echo -e "${YELLOW}Uso: $0 pm2 {start|stop|restart|delete|status|logs}${NC}"
        exit 1
        ;;
esac

exit 0
