# Scripts Simplificados - Dashboard Monitor

Esta carpeta contiene los scripts esenciales para el manejo del sistema Dashboard Monitor.

## 📋 Scripts Disponibles

### 🚀 `switch-environment.sh`
**Script principal para cambio de entornos**

```bash
./switch-environment.sh [comando]
```

**Comandos:**
- `production` - Despliega a producción (requiere rama main)
- `development` - Configura entorno de desarrollo
- `feature` - Crea nueva rama de feature + configura desarrollo
- `status` - Muestra estado actual del sistema
- `help` - Muestra ayuda

### 🔧 `maintenance.sh`
**Script de mantenimiento del sistema**

```bash
./maintenance.sh [comando]
```

**Comandos:**
- `logs` - Muestra logs recientes del sistema
- `restart` - Reinicia todos los servicios
- `status` - Estado completo del sistema
- `cleanup` - Limpia archivos temporales

## 🔄 Flujo de Trabajo Típico

### Nueva Feature
```bash
# 1. Crear rama y configurar desarrollo
./switch-environment.sh feature

# 2. Desarrollar (automático hot-reload)
# URL: https://vps-4778464-x.dattaweb.com:9003/dashboard-monitor

# 3. Al terminar, desplegar a producción
git checkout main
git merge feature/mi-feature
./switch-environment.sh production
```

### Mantenimiento
```bash
# Ver estado del sistema
./switch-environment.sh status

# Ver logs si hay problemas
./maintenance.sh logs

# Reiniciar servicios si es necesario
./maintenance.sh restart
```

## ⚙️ Configuraciones

### Entornos
- **Producción**: Puerto 9002, rama main, URL estándar HTTPS
- **Desarrollo**: Puerto 3003 (interno), puerto 9003 (nginx SSL), cualquier rama

### Servicios PM2
- `dashboard-monitor` (producción)
- `dashboard-monitor-dev` (desarrollo)

### URLs
- **Producción**: https://vps-4778464-x.dattaweb.com/dashboard-monitor
- **Desarrollo**: https://vps-4778464-x.dattaweb.com:9003/dashboard-monitor

## 🆘 Troubleshooting

### Error SSL
```bash
# Verificar configuración nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Servicios no responden
```bash
# Reiniciar todo
./maintenance.sh restart
```

### Ver logs detallados
```bash
# Logs del sistema
./maintenance.sh logs

# PM2 específico
pm2 logs dashboard-monitor
pm2 logs dashboard-monitor-dev
```

---

Para más detalles, consultar `../../WARP.md`
