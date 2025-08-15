# Guía de Despliegue Seguro

## Variables de Entorno Requeridas

### Configuración JWT (CRÍTICO)
```bash
# Generar una clave secreta segura (mínimo 32 caracteres)
JWT_SECRET="tu-clave-super-secreta-de-al-menos-32-caracteres-aqui"
JWT_EXPIRES_IN="24h"
REFRESH_TOKEN_EXPIRES_IN="7d"
```
```
semper@vps-4778464-x:~/dashboard-monitor$ openssl rand -base64 32
H4LDL3b50ygrkQ4iWotB4Xihgl958c+dQqDJxw4Axyc=
semper@vps-4778464-x:~/dashboard-monitor$ node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
ipPopAogeluq3Dz9JrYIHqum2mKmzPu3YCS5c8NXH6s=
semper@vps-4778464-x:~/dashboard-monitor$ node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
05cfa16199a15136ec0513e11cf61291f8b076e33a0951f5c1e604db14b7de46
semper@vps-4778464-x:~/dashboard-monitor$ which uuidgen && echo "$(uuidgen)$(uuidgen)" | tr -d '-' || echo "uuidgen no disponible"
/usr/bin/uuidgen
d9bf73be516d4f87834b07434ffcec7b3c800810a4c04aa2831ba204fa923441
```
### Base de Datos
```bash
DATABASE_URL="tu-cadena-de-conexion-a-base-de-datos"
```

### Configuración de Aplicación
```bash
NODE_ENV="production"
PORT="3000"
BCRYPT_SALT_ROUNDS="12"
```

## Pasos para Despliegue Seguro

### 1. Generar JWT_SECRET Seguro
```bash
# Opción 1: Usar openssl
openssl rand -base64 32

# Opción 2: Usar Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opción 3: Usar uuidgen (múltiples UUIDs)
echo "$(uuidgen)$(uuidgen)" | tr -d '-'
```

### 2. Validar Configuración
```bash
# Ejecutar script de validación
node scripts/validate-env.js
```

### 3. Lista de Verificación Pre-Despliegue

- [ ] JWT_SECRET configurado con al menos 32 caracteres
- [ ] DATABASE_URL configurado correctamente
- [ ] NODE_ENV=production
- [ ] No hay claves por defecto en el código
- [ ] Variables de entorno validadas con el script
- [ ] Logs de errores configurados apropiadamente

## Comandos de Despliegue

### Docker
```bash
# Construir imagen
docker build -t dashboard-monitor .

# Ejecutar con variables de entorno
docker run -d \
  --name dashboard-monitor \
  -p 3000:3000 \
  -e JWT_SECRET="tu-jwt-secret-aqui" \
  -e DATABASE_URL="tu-database-url-aqui" \
  -e NODE_ENV="production" \
  dashboard-monitor
```

### PM2
```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicación
pm2 start ecosystem.config.js --env production

# Guardar configuración PM2
pm2 save
pm2 startup
```

## Monitoreo de Seguridad

### Logs a Monitorear
- Intentos de login fallidos
- Tokens JWT inválidos
- Errores de autenticación
- Accesos no autorizados

### Alertas Recomendadas
- Múltiples intentos de login fallidos desde la misma IP
- Uso de tokens expirados
- Accesos fuera del horario laboral (si aplica)

## Rotación de Claves

### JWT_SECRET
1. Generar nueva clave
2. Actualizar variable de entorno
3. Reiniciar aplicación
4. Los tokens existentes se invalidarán automáticamente

### Frecuencia Recomendada
- JWT_SECRET: Cada 90 días o en caso de compromiso
- Contraseñas de base de datos: Cada 180 días

## Troubleshooting

### Error: "JWT_SECRET environment variable is required"
- Verificar que JWT_SECRET esté configurado
- Ejecutar `node scripts/validate-env.js` para diagnóstico

### Tokens no válidos después del despliegue
- Normal si se cambió JWT_SECRET
- Los usuarios necesitarán hacer login nuevamente