#!/bin/bash

# Asegurar que estamos en el directorio correcto
cd /home/semper/dashboard-monitor

# Realizar el build
echo "🏗️ Construyendo la aplicación..."
npm run build

# Crear directorio standalone si no existe
mkdir -p .next/standalone

# Copiar archivos necesarios
echo "📦 Copiando archivos..."
cp -r .next/standalone/* .
cp -r .next/static .next/
cp -r public .

# Actualizar permisos
echo "🔒 Actualizando permisos..."
chown -R semper:semper .

# Reiniciar PM2
echo "🔄 Reiniciando servicio..."
pm2 restart dashboard-monitor

echo "✅ Despliegue completado!"
