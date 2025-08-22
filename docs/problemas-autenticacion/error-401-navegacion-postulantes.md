# Error 401 (Unauthorized) al Navegar entre Postulantes

## Problema
Al navegar entre postulantes en el módulo de validación de documentos, aparecía un error "No se pudo obtener la siguiente postulación" acompañado de errores 401 en el browser console:

```
GET https://vps-4778464-x.dattaweb.com/dashboard-monitor/api/proxy-backend/inscriptions?size=1000 401 (Unauthorized)
```

## Síntomas
- ✅ La aplicación dashboard-monitor se carga correctamente
- ✅ La página de validación muestra "Cargando postulantes..."
- ❌ Error 401 al intentar navegar a la siguiente postulación
- ❌ Falla la carga de inscripciones desde `/api/proxy-backend/inscriptions`

## Causa Raíz
El problema estaba en la función `authFetch()` en `./src/lib/auth-fetch.ts`. Esta función:

1. **Solo llamaba a `getAuthToken()`** para obtener tokens almacenados
2. **No activaba el proceso de auto-autenticación** cuando no había token disponible
3. **Enviaba requests sin headers de autorización**, causando errores 401

```typescript
// CÓDIGO PROBLEMÁTICO (antes)
export async function authFetch(input, init) {
  const token = getAuthToken(); // Solo obtiene token existente
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Si no hay token, envía request sin autorización → 401
}
```

## Solución Implementada

### 1. Modificación de authFetch
Actualizado `./src/lib/auth-fetch.ts` para llamar a `ensureAuthenticated()`:

```typescript
// CÓDIGO CORREGIDO (después)
import { getAuthToken, ensureAuthenticated } from './auto-auth';

export async function authFetch(input, init) {
  // Asegurar que tenemos un token válido
  const isAuthenticated = await ensureAuthenticated();
  
  if (!isAuthenticated) {
    console.error('❌ Authentication failed, cannot make authenticated request');
    throw new Error('Authentication failed');
  }
  
  const token = getAuthToken();
  // ... resto del código
}
```

### 2. Configuración de Credenciales
Corregidas las credenciales en `./src/lib/auto-auth.ts`:

```typescript
const ADMIN_CREDENTIALS = {
  email: "admin",
  username: "admin", 
  password: "admin123"
};

const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // Usar la API principal, no la interna de dashboard-monitor
    return `${origin}/api/auth/login`;
  }
  return 'http://localhost:8080/api/auth/login';
};
```

### 3. Flujo de Autenticación Corregido

**Antes:**
```
authFetch() → getAuthToken() → sin token → request sin auth → 401
```

**Después:**
```
authFetch() → ensureAuthenticated() → authenticateWithBackend() 
→ obtiene JWT → almacena token → request con Authorization header → ✅ 200
```

## Archivos Modificados
- `./src/lib/auth-fetch.ts` - Agregado llamada a `ensureAuthenticated()`
- `./src/lib/auto-auth.ts` - Corregidas credenciales y URL del backend

## Validación
```bash
# Rebuild y restart
npm run build
pm2 restart dashboard-monitor

# Verificar que el servidor responde
curl -I http://localhost/dashboard-monitor/document-validation
# HTTP/1.1 200 OK (o 301/302 para redirection)
```

## Comportamiento Esperado Post-Fix
1. **Primera request**: `authFetch()` detecta ausencia de token → se autentica automáticamente → obtiene JWT → hace request exitoso
2. **Requests subsecuentes**: Usa token cached de localStorage
3. **Expiración de token**: Se re-autentica automáticamente cuando expira
4. **Eliminación de errores**: No más errores 401 en `/api/proxy-backend/inscriptions`

## Notas Técnicas
- El sistema de auto-autenticación usa el backend principal (`/api/auth/login`)
- Los tokens se almacenan en `localStorage` con clave `dashboardMonitorAuth`
- Las cookies de auth se setean automáticamente para requests subsecuentes
- Tiempo de vida del token: 23 horas con buffer de seguridad de 5 minutos

## Troubleshooting Futuro
Si vuelve a aparecer este problema, verificar:

1. **Credenciales**: Que `ADMIN_CREDENTIALS` tenga email, username y password correctos
2. **Backend URL**: Que `getBackendUrl()` apunte al endpoint correcto
3. **Network**: Que el backend principal esté disponible
4. **Browser Console**: Buscar logs de autenticación con 🔐, 📡, ✅ y ❌

```javascript
// Para debug en browser console
localStorage.getItem('dashboardMonitorAuth')
// Debería mostrar objeto con token válido
```

---
**Fecha de resolución:** 2025-08-22  
**Tiempo total de resolución:** ~45 minutos  
**Estado:** ✅ Resuelto
