#!/bin/bash

# =============================================================================
# Health Check Script para Dashboard Monitor
# =============================================================================

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuración
HOST=${1:-localhost}
PORT=${2:-3000}
TIMEOUT=${3:-10}

echo "🏥 Health Check - Dashboard Monitor"
echo "=================================="
echo "Host: $HOST"
echo "Port: $PORT"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Función para verificar endpoint
check_endpoint() {
    local endpoint=$1
    local description=$2
    
    if curl -f -s --max-time $TIMEOUT "http://$HOST:$PORT$endpoint" > /dev/null; then
        echo -e "${GREEN}✅ $description${NC}"
        return 0
    else
        echo -e "${RED}❌ $description${NC}"
        return 1
    fi
}

# Verificar que el puerto esté abierto
if ! nc -z $HOST $PORT 2>/dev/null; then
    echo -e "${RED}❌ Puerto $PORT no está abierto en $HOST${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Puerto $PORT está abierto${NC}"

# Verificar endpoints
FAILED=0

# Health check básico
if ! check_endpoint "/health" "Health endpoint"; then
    FAILED=$((FAILED + 1))
fi

# API endpoints (si existen)
if ! check_endpoint "/api/health" "API Health endpoint"; then
    echo -e "${YELLOW}⚠️  API Health endpoint no disponible (puede ser normal)${NC}"
fi

# Verificar tiempo de respuesta
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' --max-time $TIMEOUT "http://$HOST:$PORT/" 2>/dev/null || echo "timeout")

if [ "$RESPONSE_TIME" != "timeout" ]; then
    RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc 2>/dev/null || echo "N/A")
    if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l 2>/dev/null || echo 0) )); then
        echo -e "${GREEN}✅ Tiempo de respuesta: ${RESPONSE_MS}ms${NC}"
    else
        echo -e "${YELLOW}⚠️  Tiempo de respuesta lento: ${RESPONSE_MS}ms${NC}"
    fi
else
    echo -e "${RED}❌ Timeout en la respuesta${NC}"
    FAILED=$((FAILED + 1))
fi

# Verificar memoria (si PM2 está disponible)
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="dashboard-monitor") | .monit.memory' 2>/dev/null || echo "N/A")
    if [ "$PM2_STATUS" != "N/A" ] && [ "$PM2_STATUS" != "null" ]; then
        MEMORY_MB=$((PM2_STATUS / 1024 / 1024))
        echo -e "${GREEN}✅ Uso de memoria: ${MEMORY_MB}MB${NC}"
    fi
fi

# Verificar Docker (si está corriendo en contenedor)
if [ -f /.dockerenv ]; then
    echo -e "${GREEN}✅ Ejecutándose en contenedor Docker${NC}"
fi

echo ""
echo "=================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 Todos los checks pasaron correctamente${NC}"
    exit 0
else
    echo -e "${RED}💥 $FAILED checks fallaron${NC}"
    exit 1
fi