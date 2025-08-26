# 🏠 CONFIGURACIÓN PARA DESARROLLO LOCAL

## Pre-requisitos
- Node.js 18+
- npm o yarn
- Git configurado con SSH
- MySQL local (opcional) o conexión a DB remota

## 1. Clonar y Configurar

```bash
# Clonar repositorio
git clone git@github.com:Evincere/dashboard-monitor.git dashboard-monitor-local
cd dashboard-monitor-local

# Checkout a rama de desarrollo
git checkout feature/reportes-administrativos

# Instalar dependencias
npm install
```

## 2. Configuración de Entorno Local

```bash
# Copiar configuración base
cp .env.development .env.local

# Editar .env.local con tus configuraciones:
nano .env.local
```

### Variables de entorno locales recomendadas:
```bash
NODE_ENV=development
PORT=3000
HOSTNAME=localhost

# Base de datos (opciones)
# Opción 1: Usar DB remota (VPS)
DB_HOST=tu-vps-ip
DB_PORT=3307
DB_USER=root
DB_PASSWORD=root1234
DB_DATABASE=mpd_concursos

# Opción 2: MySQL local
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu-password-local
DB_DATABASE=mpd_concursos_dev

# Configuraciones de desarrollo
JWT_SECRET=dashboard-monitor-local-dev-2025
DEBUG=true
LOG_LEVEL=debug
NEXT_TELEMETRY_DISABLED=1
```

## 3. Scripts de Desarrollo Local

```bash
# Desarrollo rápido con Turbopack
npm run dev                    # Puerto 3000 por defecto

# Con más memoria si es necesario
npm run dev:memory            # 1024MB memoria

# Build local para testing
npm run build
npm run start                 # Probar build de producción localmente
```

## 4. Workflow de Desarrollo Recomendado

### Crear nueva feature:
```bash
git checkout feature/reportes-administrativos
git pull origin feature/reportes-administrativos
git checkout -b feature/mi-nueva-funcionalidad

# Desarrollar...
npm run dev

# Testing
npm run typecheck
npm run lint
npm run test

# Commit y push
git add .
git commit -m "feat: descripción de la funcionalidad"
git push origin feature/mi-nueva-funcionalidad
```

### Sincronizar con VPS:
```bash
# Después de completar feature
git checkout feature/reportes-administrativos
git merge feature/mi-nueva-funcionalidad
git push origin feature/reportes-administrativos

# En el VPS, cambiar a modo desarrollo y actualizar:
./environment-manager.sh dev
git pull origin feature/reportes-administrativos
```

### Deploy a producción:
```bash
# Solo cuando esté listo para producción
git checkout production-stable
git merge feature/reportes-administrativos
git push origin production-stable

# En VPS:
./environment-manager.sh deploy
```

## 5. Base de Datos Local (Opcional)

Si prefieres una DB local para desarrollo:

```bash
# Crear base de datos de desarrollo
mysql -u root -p
CREATE DATABASE mpd_concursos_dev;

# Importar schema desde producción (en VPS)
mysqldump -u root -p --no-data mpd_concursos > schema.sql

# En local, importar schema
mysql -u root -p mpd_concursos_dev < schema.sql
```

## 6. Comandos Útiles

```bash
# Ver logs de desarrollo
tail -f logs/dev-*.log

# Limpiar y reinstalar
rm -rf node_modules .next package-lock.json
npm install

# Build rápido para testing
npm run build && npm run start
```

## 7. Herramientas de Desarrollo

### VS Code Extensions recomendadas:
- TypeScript y JavaScript
- Tailwind CSS IntelliSense  
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- GitLens

### Debugging:
```bash
# Modo debug con más información
DEBUG=* npm run dev

# Solo logs de la aplicación
DEBUG=dashboard-monitor:* npm run dev
```

## 8. Solución de Problemas Comunes

### Puerto ocupado:
```bash
# Cambiar puerto en .env.local
PORT=3001

# O matar proceso en puerto
lsof -ti:3000 | xargs kill -9
```

### Problemas de memoria:
```bash
# Usar versión con más memoria
npm run dev:memory

# O configurar en .env.local
NODE_OPTIONS=--max-old-space-size=2048
```

### Problemas de dependencias:
```bash
# Limpiar e instalar
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```
