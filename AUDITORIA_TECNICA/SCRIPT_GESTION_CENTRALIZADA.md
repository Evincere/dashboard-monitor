# SCRIPT DE GESTIÓN CENTRALIZADA - DASHBOARD MONITOR

## 📋 INFORMACIÓN GENERAL

**Ubicación**: `/root/concursos/mpd_concursos/manage-dashboard-monitor.sh`  
**Propósito**: Centralizar operabilidad del microservicio dashboard-monitor  
**Fecha de Creación**: 18 de Agosto de 2025  
**Estado**: ✅ IMPLEMENTADO Y FUNCIONAL  

## 🎯 **FUNCIONALIDADES DEL SCRIPT**

### **Comandos Principales**:
```bash
# Gestión del servicio
./manage-dashboard-monitor.sh start    # Iniciar microservicio
./manage-dashboard-monitor.sh stop     # Detener microservicio  
./manage-dashboard-monitor.sh restart  # Reiniciar microservicio

# Monitoreo y diagnóstico
./manage-dashboard-monitor.sh status   # Estado actual
./manage-dashboard-monitor.sh health   # Verificación completa
./manage-dashboard-monitor.sh logs     # Logs en tiempo real

# Mantenimiento
./manage-dashboard-monitor.sh build    # Compilar aplicación
./manage-dashboard-monitor.sh config   # Verificar configuración
```

### **Verificaciones Automáticas**:
- ✅ **Estado del proceso** (PID, puerto)
- ✅ **Health endpoint** (API funcionando)
- ✅ **Conexión a base de datos** (MySQL)
- ✅ **Configuración Nginx** (proxy)
- ✅ **Uso de recursos** (memoria, CPU)

## 🔧 **CARACTERÍSTICAS TÉCNICAS**

### **Configuración**:
```bash
DASHBOARD_DIR="/home/semper/dashboard-monitor"
SERVICE_NAME="dashboard-monitor"  
PORT=9002
USER="semper"
```

### **Detección Inteligente**:
- **Proceso**: Detecta por `next-server.*v15`
- **Puerto**: Verifica con `netstat`
- **Health**: Consulta endpoint `/api/health`
- **Usuario**: Ejecuta comandos como `semper`

### **Logging**:
- **Timestamps** en todos los mensajes
- **Colores** para mejor legibilidad
- **Niveles**: INFO (verde), WARN (amarillo), ERROR (rojo)

## 📊 **EJEMPLOS DE USO**

### **Iniciar el Servicio**:
```bash
root@server:/root/concursos/mpd_concursos# ./manage-dashboard-monitor.sh start
════════════════════════════════════════════════════════════════
           GESTIÓN DASHBOARD MONITOR - MPD CONCURSOS            
════════════════════════════════════════════════════════════════

[2025-08-18 12:00:00] Iniciando Dashboard Monitor...
[2025-08-18 12:00:03] ✅ Dashboard Monitor iniciado correctamente
✅ Dashboard Monitor está EJECUTÁNDOSE
   PID: 1696624
   Puerto: 9002
   URL: http://localhost:9002
   Health: ✅ HEALTHY
```

### **Verificación de Salud**:
```bash
root@server:/root/concursos/mpd_concursos# ./manage-dashboard-monitor.sh health
=== ESTADO DEL SERVICIO ===
✅ Dashboard Monitor está EJECUTÁNDOSE

=== VERIFICACIÓN DE PUERTO ===  
✅ Puerto 9002 está en uso

=== VERIFICACIÓN DE HEALTH ENDPOINT ===
✅ Health endpoint responde correctamente
{"status": "healthy", "service": "dashboard-monitor"}

=== VERIFICACIÓN DE BASE DE DATOS ===
✅ Conexión a base de datos OK
```

## 🎯 **VENTAJAS DE LA CENTRALIZACIÓN**

### **Operativas**:
- ✅ **Control unificado** desde directorio principal del proyecto
- ✅ **Comandos estandarizados** para todo el equipo
- ✅ **Verificaciones automáticas** de dependencias
- ✅ **Logs centralizados** y debugging facilitado

### **Administrativas**:
- ✅ **No necesidad de cambiar directorio** para gestionar microservicio
- ✅ **Verificación completa** con un solo comando
- ✅ **Inicio/parada segura** con validaciones
- ✅ **Troubleshooting** integrado

### **De Mantenimiento**:
- ✅ **Build automático** si es necesario
- ✅ **Instalación de dependencias** automática
- ✅ **Verificación de configuración** integrada

## 🚀 **INTEGRACIÓN CON PLAN DE TRABAJO**

### **Como Herramienta de Desarrollo**:
```bash
# Durante implementación de correcciones:
./manage-dashboard-monitor.sh stop     # Antes de editar código
# ... realizar correcciones ...
./manage-dashboard-monitor.sh build    # Compilar cambios
./manage-dashboard-monitor.sh start    # Reiniciar con cambios
./manage-dashboard-monitor.sh health   # Verificar funcionamiento
```

### **Para Testing Post-Corrección**:
```bash
# Verificar que correcciones funcionan:
./manage-dashboard-monitor.sh status   # Servicio ejecutándose
./manage-dashboard-monitor.sh health   # Todos los checks OK
./manage-dashboard-monitor.sh logs     # Monitorear errores
```

## 📋 **UBICACIÓN EN DOCUMENTACIÓN**

### **Integrado en Plan de Acción**:
```
🔴 CRÍTICO (4.5h):
├─ Búsqueda rota (2h)
├─ Estadísticas falsas (2h)  
└─ SSL (30m)

🛠️ HERRAMIENTA: Script de gestión ✅ IMPLEMENTADO
├─ Control centralizado desde proyecto principal
├─ Comandos unificados para operación
└─ Verificaciones automáticas integradas

🟡 IMPORTANTE (8h):
└─ Sistema de Reportes Fase 1 (8h)
```

## 🔗 **COMANDOS DE GESTIÓN COMUNES**

### **Desarrollo Diario**:
```bash
# Verificar estado matutino
./manage-dashboard-monitor.sh health

# Reiniciar después de cambios
./manage-dashboard-monitor.sh restart

# Monitorear actividad
./manage-dashboard-monitor.sh logs
```

### **Deployment**:
```bash
# Deploy completo
./manage-dashboard-monitor.sh stop
./manage-dashboard-monitor.sh build
./manage-dashboard-monitor.sh start
./manage-dashboard-monitor.sh health
```

### **Troubleshooting**:
```bash
# Diagnóstico completo
./manage-dashboard-monitor.sh health
./manage-dashboard-monitor.sh config
./manage-dashboard-monitor.sh logs
```

---

**SCRIPT DE GESTIÓN CENTRALIZADA IMPLEMENTADO - Control unificado del microservicio desde proyecto principal disponible.**

