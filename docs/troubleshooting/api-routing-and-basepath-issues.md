# 🚨 GUÍA DE TROUBLESHOOTING: Problemas de Ruteo de APIs y BasePath

## 📋 PROBLEMA RECURRENTE

Este es un problema que hemos experimentado múltiples veces en el proyecto dashboard-monitor. Se manifiesta como **errores 404** cuando el frontend intenta acceder a endpoints de API que sabemos que existen y funcionan correctamente.

### 🔍 **Síntomas Típicos**
- ✅ El endpoint existe y funciona cuando se accede directamente
- ❌ El frontend retorna 404 al intentar hacer la request
- 🕵️ Las herramientas de desarrollo del navegador muestran requests a URLs incorrectas
- 📍 El error aparece específicamente en dominios externos (no localhost)

### 🎯 **Causa Raíz**
Next.js está configurado con `basePath: '/dashboard-monitor'` para funcionar como un microservicio montado en una ruta específica. Sin embargo, las funciones de fetch del frontend no siempre consideran este basePath automáticamente, especialmente cuando:

1. Se usan URLs relativas que comienzan con `/api/`
2. El contexto del navegador usa `window.location.origin` para construir URLs absolutas
3. El dominio externo no tiene el contexto del basePath

---

## 🔧 CASO EJEMPLO: Error 404 en API de Reportes (Agosto 2025)

### **Situación**
- **Frontend**: Intenta acceder a `/api/reports/dashboard/metrics`
- **Error**: 404 Not Found
- **URL Generada**: `https://vps-4778464-x.dattaweb.com/api/reports/dashboard/metrics`
- **URL Correcta**: `https://vps-4778464-x.dattaweb.com/dashboard-monitor/api/reports/dashboard/metrics`

### **Diagnóstico**
```bash
# ❌ Esta request falla (404)
curl -I http://localhost:9002/api/reports/dashboard/metrics

# ✅ Esta request funciona (200)
curl -I http://localhost:9002/dashboard-monitor/api/reports/dashboard/metrics
```

### **Causa Específica**
El hook `useReportData.ts` llamaba:
```typescript
const response = await authFetch('/api/reports/dashboard/metrics');
```

Pero `authFetch` no estaba manejando las rutas de reportes con el basePath requerido.

### **Solución Implementada**
Se modificó `src/lib/auth-fetch.ts` para detectar rutas de reportes y aplicar el basePath automáticamente:

```typescript
// Process URL to ensure correct routing
let finalUrl: string;
if (typeof input === 'string') {
  // Handle reports API routes - these need the basePath
  if (input.startsWith('/api/reports/') || input.startsWith('api/reports/')) {
    const cleanPath = input.replace(/^\//, '');
    finalUrl = `/dashboard-monitor/${cleanPath}`;
  } else {
    finalUrl = input;
  }
} else {
  finalUrl = input.toString();
}
```

---

## 🛠️ GUÍA DE DIAGNÓSTICO Y RESOLUCIÓN

### **Paso 1: Identificar el Problema**
```bash
# Verificar que el endpoint existe
curl -I http://localhost:9002/dashboard-monitor/api/[tu-endpoint]

# Si retorna 200, el endpoint funciona
# Si retorna 404, revisar la implementación del endpoint
```

### **Paso 2: Verificar la Configuración de Next.js**
```typescript
// Revisar next.config.ts
const nextConfig: NextConfig = {
  basePath: '/dashboard-monitor',  // ← Este es el problema
  assetPrefix: '/dashboard-monitor',
  // ...
};
```

### **Paso 3: Identificar URLs Problemáticas**
Buscar en el código llamadas a APIs que no consideren el basePath:
```bash
# Buscar llamadas directas a /api/
grep -r "'/api/" src/ --include="*.ts" --include="*.tsx"

# Buscar uso de authFetch con rutas problemáticas  
grep -r "authFetch.*api" src/ --include="*.ts" --include="*.tsx"
```

### **Paso 4: Aplicar la Solución**
Modificar `src/lib/auth-fetch.ts` para manejar la categoría de endpoints problemática:

```typescript
// Agregar detección para la nueva categoría de endpoints
if (input.startsWith('/api/nueva-categoria/') || input.startsWith('api/nueva-categoria/')) {
  const cleanPath = input.replace(/^\//, '');
  finalUrl = `/dashboard-monitor/${cleanPath}`;
}
```

### **Paso 5: Probar la Solución**
```bash
# Reiniciar el servidor
pm2 restart dashboard-monitor

# Probar el endpoint corregido
curl -I http://localhost:9002/dashboard-monitor/api/[tu-endpoint]
```

---

## 📚 CATEGORÍAS DE ENDPOINTS Y SU RUTEO

### **Endpoints que requieren basePath** (`/dashboard-monitor/`)
- ✅ `/api/reports/*` - APIs de reportes
- ✅ `/api/proxy-backend/*` - Proxy al backend principal
- ✅ `/api/postulations/*` - APIs de postulaciones
- ✅ `/api/validation/*` - APIs de validación
- ✅ `/api/documents/*` - APIs de documentos

### **Endpoints que NO requieren basePath** (`/`)
- ✅ `/api/auth/*` - Autenticación del sistema principal
- ✅ Endpoints externos al dashboard-monitor

---

## ⚡ PREVENCIÓN DE PROBLEMAS FUTUROS

### **1. Usar la Función `apiUrl()` Helper**
```typescript
import { apiUrl } from '@/lib/auth-fetch';

// En lugar de usar URLs directas:
const badUrl = '/api/reports/new-endpoint';

// Usar el helper:
const goodUrl = apiUrl('reports/new-endpoint');
```

### **2. Documentar Nuevos Endpoints**
Al crear nuevos endpoints, agregar su categoría a esta documentación.

### **3. Testing Consistente**
```bash
# Siempre probar ambas rutas durante desarrollo
curl -I http://localhost:9002/api/nuevo-endpoint          # ❌ Debería fallar
curl -I http://localhost:9002/dashboard-monitor/api/nuevo-endpoint  # ✅ Debería funcionar
```

### **4. Logging de Depuración**
El `authFetch` incluye logging que muestra la transformación de URLs:
```
📡 authFetch: {
  originalUrl: '/api/reports/dashboard/metrics',
  finalUrl: '/dashboard-monitor/api/reports/dashboard/metrics',
  method: 'GET',
  hasToken: true
}
```

---

## 📞 CHECKLIST RÁPIDO PARA NUEVOS ENDPOINTS

- [ ] ¿El endpoint funciona con curl directo usando el basePath?
- [ ] ¿El `authFetch` está transformando la URL correctamente?
- [ ] ¿El endpoint está documentado en esta guía?
- [ ] ¿Se probó tanto en localhost como en producción?
- [ ] ¿Los logs muestran la transformación de URL esperada?

---

**Versión**: 1.0  
**Fecha**: Agosto 2025  
**Última actualización**: Error 404 en API de Reportes - Solucionado
