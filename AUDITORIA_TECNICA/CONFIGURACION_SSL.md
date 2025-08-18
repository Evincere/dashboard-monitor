# CONFIGURACIÓN SSL - DASHBOARD MONITOR MPD

## 📋 ESTADO ACTUAL SSL

### ✅ **SSL YA CONFIGURADO EN EL SISTEMA**
- **Certificados Let's Encrypt**: ✅ Vigentes hasta 28 Sep 2025
- **Redirección HTTP→HTTPS**: ✅ Configurada automáticamente  
- **Ubicación certificados**: `/etc/letsencrypt/live/vps-4778464-x.dattaweb.com/`

### ⚠️ **PROBLEMA IDENTIFICADO**
El **dashboard-monitor NO está incluido** en la configuración SSL actual de Nginx.

## 🔍 ANÁLISIS TÉCNICO

### Configuración Actual de Nginx:
```nginx
# /etc/nginx/sites-enabled/mpd-concursos (ACTIVA)
server {
    listen 443 ssl;
    server_name vps-4778464-x.dattaweb.com;
    
    # SSL configurado ✅
    ssl_certificate /etc/letsencrypt/live/.../fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/.../privkey.pem;
    
    # PROBLEMA: Dashboard-monitor NO está configurado aquí ❌
    location /monitor {
        proxy_pass http://localhost:9003;  # ❌ Puerto incorrecto
    }
}
```

### Dashboard Monitor Real:
```bash
Puerto real: 9002 ✅ (verificado con netstat)
Puerto configurado en Nginx: 9003 ❌ (incorrecto)
```

## 🔧 SOLUCIÓN REQUERIDA

### 1. **Corregir Puerto en Nginx**

Editar `/etc/nginx/sites-enabled/mpd-concursos`:

```nginx
# CAMBIAR:
location /monitor {
    proxy_pass http://localhost:9003;  # ❌ Incorrecto

# POR:
location /monitor {
    proxy_pass http://localhost:9002;  # ✅ Correcto
```

### 2. **Verificar Configuración Dashboard-Monitor**

El dashboard-monitor YA está configurado para SSL:
```typescript
# /home/semper/dashboard-monitor/.env
PORT=9002  ✅
NEXT_PUBLIC_BASE_PATH=/dashboard-monitor  ✅ 
```

### 3. **Configuración SSL Completa para Dashboard-Monitor**

```nginx
# Agregar al bloque server 443 en /etc/nginx/sites-enabled/mpd-concursos

# Dashboard Monitor - Puerto correcto y configuración SSL completa
location /dashboard-monitor/ {
    proxy_pass http://localhost:9002/dashboard-monitor/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;  # ✅ IMPORTANTE para SSL
    proxy_cache_bypass $http_upgrade;
    
    # Headers adicionales para Next.js
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Server $host;
    
    # Timeouts para consultas de IA y validaciones
    proxy_connect_timeout 120s;
    proxy_send_timeout 120s;
    proxy_read_timeout 120s;
}

# API routes del dashboard-monitor
location /dashboard-monitor/api/ {
    proxy_pass http://localhost:9002/dashboard-monitor/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;  # ✅ IMPORTANTE para SSL
    
    # Timeouts extendidos para APIs pesadas
    proxy_connect_timeout 180s;
    proxy_send_timeout 180s;
    proxy_read_timeout 180s;
}

# Archivos estáticos Next.js del dashboard-monitor
location /dashboard-monitor/_next/ {
    proxy_pass http://localhost:9002/dashboard-monitor/_next/;
    expires 1y;
    add_header Cache-Control "public, immutable";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
}
```

## 📝 PASOS DE IMPLEMENTACIÓN

### Paso 1: Backup de Configuración Actual
```bash
sudo cp /etc/nginx/sites-enabled/mpd-concursos /etc/nginx/sites-enabled/mpd-concursos.backup-pre-dashboard-ssl-$(date +%Y%m%d_%H%M%S)
```

### Paso 2: Editar Configuración
```bash
sudo nano /etc/nginx/sites-enabled/mpd-concursos
# Agregar configuración SSL para dashboard-monitor
```

### Paso 3: Verificar Configuración  
```bash
sudo nginx -t
```

### Paso 4: Aplicar Cambios
```bash
sudo systemctl reload nginx
```

### Paso 5: Verificar Funcionamiento
```bash
curl -I https://vps-4778464-x.dattaweb.com/dashboard-monitor/api/health
```

## 🔒 VERIFICACIÓN DE SSL

### Estado de Certificados:
```
Dominio: vps-4778464-x.dattaweb.com
Vigencia: 30 Jun 2025 → 28 Sep 2025 ✅ (58 días restantes)
Autoridad: Let's Encrypt ✅
Auto-renovación: Configurada ✅
```

### Verificación Post-Implementación:
```bash
# Verificar SSL funciona
curl -I https://vps-4778464-x.dattaweb.com/dashboard-monitor/

# Verificar redirección HTTP→HTTPS
curl -I http://vps-4778464-x.dattaweb.com/dashboard-monitor/

# Verificar API con SSL
curl -I https://vps-4778464-x.dattaweb.com/dashboard-monitor/api/health
```

## 🎯 RESULTADO ESPERADO

### Antes de la Corrección:
```
❌ http://vps-4778464-x.dattaweb.com/dashboard-monitor/ → "Conexión insegura"
❌ Puerto incorrecto (9003 vs 9002) → Error de proxy
```

### Después de la Corrección:
```
✅ https://vps-4778464-x.dattaweb.com/dashboard-monitor/ → "Conexión segura"
✅ Puerto correcto (9002) → Proxy funcionando
✅ Certificado SSL válido → Sin warnings de seguridad
```

## ⚠️ CONSIDERACIONES IMPORTANTES

1. **El certificado SSL ya existe y es válido**
2. **Solo necesitamos corregir la configuración de Nginx**
3. **No hay que generar nuevos certificados**
4. **La renovación automática ya está configurada**

## 📊 PRÓXIMOS PASOS

1. **Corregir puerto 9003→9002** en Nginx
2. **Agregar configuración SSL completa** para dashboard-monitor
3. **Verificar funcionamiento** con HTTPS
4. **Documentar cambios aplicados**

---

**El SSL ya está disponible, solo requiere configuración correcta para el dashboard-monitor.**

