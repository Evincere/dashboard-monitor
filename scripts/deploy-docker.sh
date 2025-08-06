#!/bin/bash

echo "🐳 Desplegando Dashboard Monitor con Docker..."

# Verificar que Docker esté funcionando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está funcionando"
    exit 1
fi

# Verificar memoria disponible
AVAILABLE_MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $7}')
echo "📊 Memoria disponible: ${AVAILABLE_MEMORY}MB"

if [ $AVAILABLE_MEMORY -lt 1500 ]; then
    echo "⚠️  Memoria disponible baja para build Docker. Recomendado: >1500MB"
    echo "💡 Considera cerrar otras aplicaciones temporalmente"
    read -p "¿Continuar de todos modos? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Verificar que la red externa existe
if ! docker network ls | grep -q "mpd_concursos_mpd-concursos-network"; then
    echo "❌ La red mpd_concursos_mpd-concursos-network no existe"
    echo "💡 Asegúrate de que el sistema mpd_concursos esté funcionando"
    exit 1
fi

# Crear volumen si no existe
if ! docker volume ls | grep -q "dashboard-monitor_vector_store"; then
    echo "📦 Creando volumen para almacenamiento vectorial..."
    docker volume create dashboard-monitor_vector_store
fi

# Detener contenedor existente si está funcionando
if docker ps | grep -q "dashboard-monitor"; then
    echo "🛑 Deteniendo contenedor existente..."
    docker stop dashboard-monitor
    docker rm dashboard-monitor
fi

# Limpiar imágenes no utilizadas para liberar espacio
echo "🧹 Limpiando imágenes no utilizadas..."
docker system prune -f

# Build de la imagen con configuración optimizada para memoria limitada
echo "🏗️  Construyendo imagen Docker..."
if [ $AVAILABLE_MEMORY -lt 1500 ]; then
    echo "💾 Usando configuración de memoria limitada..."
    docker build -t dashboard-monitor:latest . --memory=1g --memory-swap=2g
else
    docker build -t dashboard-monitor:latest . --no-cache
fi

if [ $? -ne 0 ]; then
    echo "❌ Error durante el build de Docker"
    echo "💡 Sugerencias:"
    echo "   - Ejecuta: npm install para sincronizar dependencias"
    echo "   - Verifica que tengas suficiente espacio en disco"
    echo "   - Considera cerrar otras aplicaciones"
    exit 1
fi

# Iniciar el contenedor
echo "🚀 Iniciando contenedor..."
docker compose up -d

if [ $? -eq 0 ]; then
    echo "✅ Dashboard Monitor desplegado exitosamente"
    echo ""
    echo "🌐 Aplicación disponible en:"
    echo "   - Local: http://localhost:9002/dashboard-monitor/"
    echo "   - Red: http://149.50.132.23:9002/dashboard-monitor/"
    echo ""
    echo "🔍 Verificando estado..."
    sleep 3
    if curl -s http://localhost:9002/dashboard-monitor/api/health > /dev/null; then
        echo "✅ API respondiendo correctamente"
    else
        echo "⚠️  API no responde aún, puede necesitar unos segundos más"
    fi
    echo ""
    echo "📊 Comandos útiles:"
    echo "   - Ver logs: docker logs -f dashboard-monitor"
    echo "   - Estado: docker ps | grep dashboard-monitor"
    echo "   - Detener: docker compose down"
else
    echo "❌ Error al iniciar el contenedor"
    exit 1
fi