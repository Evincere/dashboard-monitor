# 📋 Documentación: Sistema de Navegación Automática
## Microservicio de Validación de Documentos

**Fecha de documentación:** 2025-08-19 05:23:59
**Versión:** v2.0 - Navegación Automática Implementada

---

## 🎯 Resumen Ejecutivo

Se ha implementado un sistema completo de navegación automática para el proceso de validación de documentos en concursos. El sistema permite a los validadores moverse eficientemente entre postulaciones pendientes sin interrupciones manuales.

### ⭐ Funcionalidades Principales

1. **Navegación Automática Post-Aprobación**: Tras aprobar una postulación, el sistema busca y navega automáticamente a la siguiente postulación pendiente
2. **Botón Verde de Navegación Manual**: Permite saltar manualmente a la próxima postulación sin aprobar la actual
3. **Botón "Aprobar sin Continuar"**: Aprueba la postulación actual pero permanece en la misma página
4. **Filtrado Inteligente**: Solo muestra postulaciones relevantes (estados COMPLETED_WITH_DOCS y PENDING)

---

## 🏗️ Arquitectura del Sistema

### Frontend (Next.js 15.3.3)
- **Ubicación**: `/home/semper/dashboard-monitor/src/app/(dashboard)/postulations/[dni]/documents/validation/page.tsx`
- **Puerto**: 9002 
- **Ruta**: `https://vps-4778464-x.dattaweb.com/dashboard-monitor/postulations/[dni]/documents/validation`

### Backend Real (Spring Boot)
- **Ubicación**: `/root/concursos/mpd_concursos/concurso-backend`
- **Puerto**: 8080
- **Base URL**: `http://localhost:8080`

---

## 🔄 Flujo de Navegación Automática

### 1. Aprobación y Navegación Automática (handleApproveAndContinue)

**Flujo de pasos:**
1. **Aprobación**: POST /dashboard-monitor/api/postulations/{dni}/approve
2. **Búsqueda**: GET /dashboard-monitor/api/validation/next-postulation?currentDni={dni}&excludeStates=APPROVED,REJECTED
3. **Navegación**: router.push a la próxima postulación
4. **Feedback**: Toast notifications al usuario

### 2. Navegación Manual (handleNextPostulation)

**Flujo simplificado:**
1. **Búsqueda directa**: GET /dashboard-monitor/api/validation/next-postulation
2. **Navegación inmediata**: Sin aprobar la postulación actual

---

## 🌐 Interacciones con Backend Real

### Endpoints del Microservicio → Backend Real

#### 1. **Aprobación de Postulación**
```
Frontend → POST /dashboard-monitor/api/postulations/{dni}/approve
         ↓
Microservicio → POST http://localhost:8080/api/postulations/{dni}/approve
```

**Payload enviado al backend:**
```json
{
  "note": "Postulación aprobada - Navegando a siguiente automáticamente"
}
```

#### 2. **Búsqueda de Próxima Postulación**
```
Frontend → GET /dashboard-monitor/api/validation/next-postulation?currentDni={dni}&excludeStates=APPROVED,REJECTED
         ↓
Microservicio → GET http://localhost:8080/api/inscriptions?pageSize=300
         ↓
Microservicio → Filtra localmente y retorna próxima válida
```

**Respuesta del endpoint:**
```json
{
  "success": true,
  "hasNext": true,
  "dni": "41660178",
  "postulant": {
    "dni": "41660178", 
    "fullName": "Nicolas Martin Serrano Carpio",
    "email": "nicolasmartinserrano@gmail.com"
  },
  "inscription": {
    "id": "ec592bbc-0278-43...",
    "state": "COMPLETED_WITH_DOCS"
  }
}
```

#### 3. **Listado de Postulaciones Optimizado**
```
Frontend → GET /dashboard-monitor/api/postulations/management
         ↓  
Microservicio → GET http://localhost:8080/api/inscriptions?pageSize=300
         ↓
Microservicio → Filtra por estados [COMPLETED_WITH_DOCS, PENDING]
```

**Filtros aplicados:**
- ✅ Excluye usuarios con estado "ACTIVE" (no tienen documentos)
- ✅ Incluye solo "COMPLETED_WITH_DOCS" y "PENDING"
- ✅ Timeout de 45 segundos para evitar bloqueos

---

## 🔧 Componentes Técnicos Modificados

### 1. Página de Validación (page.tsx)

**Funciones agregadas:**
- `handleApproveAndContinue()`: Aprueba y navega automáticamente
- `handleNextPostulation()`: Navegación manual mejorada  
- **Estados**: isProcessing, isNavigating, isModalDismissed

### 2. Modal de Validación (ValidationCompletionModal.tsx)

**Props agregadas:**
- `onApproveAndContinue?: () => void`
- `setModalDismissed?: (value: boolean) => void`

**Botón nuevo:**
- "Aprobar y continuar con la siguiente" (verde)

### 3. Endpoint de Próxima Postulación (route.ts)

**Parámetros de entrada:**
- `currentDni`: DNI de la postulación actual
- `excludeStates`: Estados a excluir (APPROVED,REJECTED)

**Lógica implementada:**
1. Consulta inscripciones al backend real
2. Filtra por estados válidos
3. Encuentra la próxima postulación después de la actual
4. Retorna datos completos o indica fin de lista

---

## ⚡ Optimizaciones de Rendimiento

### 1. Timeouts Ajustados
- **Listado general**: 45 segundos
- **Navegación rápida**: 10 segundos
- **Búsqueda específica**: 5 segundos

### 2. Reducción de Carga
- **PageSize**: 300 registros máximo
- **Filtrado temprano**: Estados irrelevantes excluidos
- **Consultas directas**: Sin dependencia de arrays locales

### 3. Manejo de Errores
- **AbortSignal.timeout()**: Cancelación automática de peticiones largas
- **Fallback inteligente**: Redirección al listado cuando no hay más postulaciones
- **Feedback inmediato**: Toast notifications para todos los estados

---

## 🚨 Troubleshooting

### Error 502 Bad Gateway
**Causa**: Build corrupto o sintaxis JSX inválida
**Solución**: 
```bash
cd /home/semper/dashboard-monitor
git restore src/app/(dashboard)/postulations/[dni]/documents/validation/page.tsx
npm run build
pm2 restart dashboard-monitor
```

### Navegación se queda cargando
**Causa**: Timeout en búsqueda de próxima postulación
**Verificar**: 
```bash
curl http://localhost:8080/api/health
curl http://localhost:9002/dashboard-monitor/api/validation/next-postulation
```

### Modal no aparece
**Causa**: Props faltantes en ValidationCompletionModal
**Verificar**: Que onApproveAndContinue esté pasado como prop

---

## 📈 Métricas de Éxito

### Antes de la implementación:
- ❌ Navegación manual entre postulaciones
- ❌ Botón verde sin funcionalidad
- ❌ Falta botón "aprobar sin continuar"
- ❌ Dependencia de arrays locales para navegación

### Después de la implementación:
- ✅ Navegación automática tras aprobación
- ✅ Botón verde totalmente funcional
- ✅ Botón "aprobar sin continuar" operativo
- ✅ Consultas directas al backend para navegación robusta

---

**Sistema desarrollado y documentado por:** Asistente IA
**Entorno de producción:** https://vps-4778464-x.dattaweb.com/dashboard-monitor/
**Estado del sistema:** ✅ COMPLETAMENTE FUNCIONAL
