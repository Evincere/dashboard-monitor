# 🚀 GUÍA DE USO: Script de Gestión Dashboard Monitor

## 📋 INTRODUCCIÓN

El script `manage-dashboard-monitor.sh` v2.0 es una herramienta centralizada para la gestión completa del microservicio dashboard-monitor. Incorpora todas las lecciones aprendidas de los problemas ChunkLoadError, servidor standalone y errores de ruteo de APIs.

## 🔧 COMANDOS PRINCIPALES

### **📋 INFORMACIÓN**

#### `./manage-dashboard-monitor.sh status`
- **Propósito**: Verificación completa del estado del sistema
- **Incluye**: Dependencias, estructura de proyecto, configuración, PM2 status
- **Cuándo usar**: Para obtener un overview rápido del estado actual

```bash
# Ejemplo de salida
[2025-08-22 08:16:37] ✅ Configuración standalone encontrada
[2025-08-22 08:16:37] ✅ PM2 configurado para servidor standalone
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
│ 0  │ dashboard-monitor  │ fork     │ 0    │ online    │ 0%       │ 206.8mb  │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

#### `./manage-dashboard-monitor.sh health`
- **Propósito**: Verificación de salud de endpoints críticos
- **Incluye**: Test de conectividad y respuesta de APIs principales
- **Cuándo usar**: Después de despliegues o cuando se sospechan problemas

```bash
# Ejemplo de salida
[2025-08-22 08:16:46] ✅ /dashboard-monitor - HTTP 200
[2025-08-22 08:16:46] ✅ /dashboard-monitor/reportes - HTTP 200
[2025-08-22 08:16:46] ✅ /dashboard-monitor/api/reports/dashboard/metrics - HTTP 200
```

#### `./manage-dashboard-monitor.sh diagnose`
- **Propósito**: Diagnóstico avanzado de problemas comunes
- **Incluye**: Verificación de builds, archivos estáticos, puertos, configuración
- **Cuándo usar**: Para investigar errores o comportamientos inesperados

#### `./manage-dashboard-monitor.sh logs`
- **Propósito**: Mostrar logs recientes de la aplicación
- **Cuándo usar**: Para debuggear problemas o verificar el comportamiento

---

### **🔧 GESTIÓN**

#### `./manage-dashboard-monitor.sh start`
- **Propósito**: Iniciar la aplicación desde cero
- **Incluye**: Verificaciones previas + inicio con PM2 + health check
- **Cuándo usar**: Primera vez que se inicia o después de detener completamente

#### `./manage-dashboard-monitor.sh stop`
- **Propósito**: Detener la aplicación completamente
- **Cuándo usar**: Mantenimiento, cambios de configuración mayores

#### `./manage-dashboard-monitor.sh restart`
- **Propósito**: Reinicio inteligente de la aplicación
- **Comportamiento**: Si está corriendo -> restart, si no -> start
- **Cuándo usar**: Después de cambios menores de código

#### `./manage-dashboard-monitor.sh reload`
- **Propósito**: Recarga completa (git pull + build clean + restart + health check)
- **Cuándo usar**: Para despliegues completos desde el repositorio remoto
- **⚠️ IMPORTANTE**: Este es el comando más completo para actualizaciones

---

### **🔨 BUILD**

#### `./manage-dashboard-monitor.sh build`
- **Propósito**: Build rápido sin limpiar cache
- **Auto-fallback**: Si no se genera standalone correctamente, ejecuta build-clean
- **Cuándo usar**: Para cambios menores o cuando el build anterior fue exitoso

#### `./manage-dashboard-monitor.sh build-clean`
- **Propósito**: Build limpio completo
- **Acciones**: Elimina .next + cache + reinstala dependencias + build completo
- **Cuándo usar**: Problemas de ChunkLoadError, assets corruptos, cambios mayores

#### `./manage-dashboard-monitor.sh fix-chunks`
- **Propósito**: Solución automatizada para ChunkLoadError
- **Acciones**: stop + build-clean + start + health check
- **Cuándo usar**: Específicamente para errores ChunkLoadError o assets 404

---

### **📂 GIT**

#### `./manage-dashboard-monitor.sh git-status`
- **Propósito**: Estado completo de Git (branch, cambios, último commit)
- **Cuándo usar**: Para verificar el estado antes de despliegues

#### `./manage-dashboard-monitor.sh git-pull`
- **Propósito**: Actualizar código desde repositorio remoto
- **Cuándo usar**: Como paso previo a `reload` o para obtener cambios recientes

---

## 🎯 CASOS DE USO COMUNES

### **🚨 Problema: ChunkLoadError en el navegador**
```bash
./manage-dashboard-monitor.sh fix-chunks
```
Este comando automatiza la solución completa que descubrimos.

### **🔄 Despliegue completo desde repositorio**
```bash
./manage-dashboard-monitor.sh reload
```
Equivale a: git pull + build-clean + restart + health check.

### **🩺 Verificar que todo funciona después de cambios**
```bash
./manage-dashboard-monitor.sh health
```

### **🔍 Investigar problemas**
```bash
./manage-dashboard-monitor.sh diagnose
./manage-dashboard-monitor.sh logs
```

### **📊 Estado general del sistema**
```bash
./manage-dashboard-monitor.sh status
```

---

## ⚡ CARACTERÍSTICAS AVANZADAS

### **🔧 Verificaciones Automáticas**
- **Dependencias del sistema**: node, npm, pm2, curl, git
- **Estructura del proyecto**: archivos críticos y directorios
- **Configuración de build**: output: standalone, basePath, PM2 config
- **Archivos de build**: servidor standalone, assets estáticos

### **🛡️ Protecciones**
- **Auto-fallback**: Si build rápido falla, ejecuta build limpio
- **Detección inteligente**: Identifica si PM2 está mal configurado
- **Health checks**: Verifica que los endpoints respondan correctamente
- **Error handling**: Manejo robusto de errores con mensajes claros

### **📈 Monitoreo**
- **Logging colorizado**: Fácil identificación de info, warnings y errores  
- **Timestamps**: Seguimiento temporal de operaciones
- **Progress indicators**: Feedback visual del progreso de operaciones

---

## 🧠 RESOLUCIÓN DE PROBLEMAS

### **El script no encuentra archivos**
```bash
# Verificar que estás en el directorio correcto
cd /home/semper/dashboard-monitor
./manage-dashboard-monitor.sh status
```

### **Errores de permisos**
```bash
chmod +x manage-dashboard-monitor.sh
```

### **El servidor no responde en health check**
```bash
# Diagnosticar primero
./manage-dashboard-monitor.sh diagnose

# Luego rebuild completo
./manage-dashboard-monitor.sh fix-chunks
```

### **PM2 está en estado "errored"**
```bash
# Stop completo y restart limpio
./manage-dashboard-monitor.sh stop
./manage-dashboard-monitor.sh start
```

---

## 📚 REFERENCIA RÁPIDA

| Comando | Tiempo | Disruptivo | Cuándo Usar |
|---------|--------|------------|-------------|
| `status` | 5s | No | Verificación general |
| `health` | 10s | No | Test de endpoints |
| `logs` | Instantáneo | No | Debug |
| `restart` | 20s | Sí | Cambios menores |
| `build` | 30s | No | Build rápido |
| `build-clean` | 2-5min | No | Build completo |
| `fix-chunks` | 3-6min | Sí | ChunkLoadError |
| `reload` | 3-6min | Sí | Despliegue completo |

---

**Versión**: 2.0  
**Fecha**: Agosto 2025  
**Mantenido por**: Dashboard Monitor Team
