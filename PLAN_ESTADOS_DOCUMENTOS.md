# Plan de Implementación - Corrección de Estados de Documentos

**Fecha:** 21 de agosto de 2025  
**Problema:** Inconsistencia entre los estados de documentos mostrados en el buscador (PENDING) vs validador (APPROVED)

## 🔍 Diagnóstico Realizado

### Estados Observados:
- **Buscador de Documentos** (`/api/documents`): Muestra estados como `PENDING`
- **Validador de Postulaciones** (`/api/postulations/[dni]/documents`): Muestra estados como `APPROVED`

### Documentos de Prueba:
- **Usuario**: Sergio Mauricio Pereyra (DNI: 26598410)
- **Documentos**: 7 documentos totales
- **Estado en Buscador**: PENDING
- **Estado en Validador**: APPROVED (7/7 documentos)

### Análisis del Backend:
- **Campo correcto**: `estado` (mapeo desde `document.getStatus().name()`)
- **Enum de Estados**: `PENDING`, `APPROVED`, `REJECTED`, `PROCESSING`, `ERROR`
- **Mapper**: `DocumentMapper.java` línea 37: `.estado(document.getStatus().name())`

## 📋 Plan de Implementación

### **Fase 1: Verificación de Fuente de Verdad** ✅
1. ✅ Crear plan de implementación
2. 🔄 Verificar estado real en base de datos MySQL
3. 🔄 Confirmar que el validador es la fuente de verdad correcta

### **Fase 2: Unificación de Lógica de Mapeo**
1. **Analizar diferencias entre APIs**:
   - Revisar `./src/app/api/documents/route.ts` 
   - Revisar `./src/app/api/postulations/[dni]/documents/route.ts`
   - Identificar diferencias en el mapeo de estados

2. **Implementar lógica unificada**:
   - Crear función común `mapDocumentStatus()` 
   - Aplicar la misma lógica en ambos endpoints
   - Priorizar el campo correcto (`status` vs `estado`)

3. **Actualizar mapeo de documentos**:
   ```typescript
   // Actual (inconsistente)
   validationStatus: normalizeValidationStatus(backendDoc.status || backendDoc.estado || backendDoc.validationStatus)
   
   // Propuesto (consistente con postulaciones)
   validationStatus: normalizeValidationStatus(doc.status || doc.estado || 'PENDING')
   ```

### **Fase 3: Testing y Validación**
1. **Tests unitarios**:
   - Crear tests para `mapDocumentStatus()`
   - Verificar mapeo correcto de todos los estados

2. **Tests de integración**:
   - Verificar consistencia entre ambos endpoints
   - Confirmar que ambos muestran los mismos estados

3. **Verificación manual**:
   - Comparar estados en buscador vs validador
   - Verificar con diferentes usuarios y documentos

### **Fase 4: Mejoras Adicionales**
1. **Interfaz de usuario**:
   - ✅ Remover campo "Filtrar por usuario" (completado)
   - Mejorar indicadores visuales de estado
   - Agregar tooltips explicativos

2. **Logging y monitoreo**:
   - Agregar logs de debug para mapeo de estados
   - Implementar métricas de consistencia

3. **Documentación**:
   - Documentar la lógica de estados
   - Crear guía de resolución de problemas

## 🎯 Criterios de Aceptación

### **Funcionales:**
- [ ] Buscador y validador muestran estados consistentes
- [ ] Estados reflejan el valor real de la base de datos
- [ ] Búsqueda funciona correctamente sin campo "usuario"
- [ ] Todos los estados posibles se manejan correctamente

### **No Funcionales:**
- [ ] Performance no se ve afectada
- [ ] No hay regresiones en funcionalidad existente
- [ ] Logs proporcionan información útil para debugging

## 🔧 Archivos a Modificar

### **Frontend (Dashboard-Monitor)**
- `./src/app/api/documents/route.ts` - Corregir mapeo de estados
- `./src/app/(dashboard)/documents/page.tsx` - ✅ Remover filtro usuario
- `./src/lib/backend-client.ts` - Actualizar interfaces si necesario

### **Potenciales (según hallazgos)**
- Crear utilidades comunes para mapeo de estados
- Actualizar tests existentes

## 📝 Notas de Implementación

### **Estados Conocidos del Backend:**
```java
public enum DocumentStatus {
    PENDING, APPROVED, REJECTED, PROCESSING, ERROR
}
```

### **Mapeo Actual en Postulaciones (CORRECTO):**
```typescript
validationStatus: (doc.status || doc.estado || 'PENDING') as 'PENDING' | 'APPROVED' | 'REJECTED'
```

### **Mapeo Actual en Documentos (INCONSISTENTE):**
```typescript
validationStatus: normalizeValidationStatus(backendDoc.status || backendDoc.estado || backendDoc.validationStatus)
```

## 🚀 Próximos Pasos

1. **Inmediato**: Verificar base de datos para confirmar fuente de verdad
2. **Desarrollo**: Implementar lógica unificada de mapeo
3. **Testing**: Verificar consistencia entre endpoints
4. **Deploy**: Aplicar cambios en producción

---

**Estado del Plan**: 🔄 En Progreso  
**Próxima Tarea**: Verificación de base de datos MySQL
