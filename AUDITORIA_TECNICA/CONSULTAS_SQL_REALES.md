# CONSULTAS SQL REALES - REEMPLAZO DE ESTIMACIONES

## Fecha: 2025-08-18

## PROBLEMA ACTUAL
El sistema usa estimaciones matemáticas en lugar de consultas SQL reales:
```typescript
// ❌ INCORRECTO - Estimaciones falsas
validationCompleted: Math.floor(totalEligible * 0.25), // 25% completadas
validationPending: Math.floor(totalEligible * 0.75),   // 75% pendientes  
validationRejected: Math.floor(totalEligible * 0.05)   // 5% rechazadas
```

## CONSULTAS CORRECTAS REQUERIDAS

### 1. **Validaciones Completadas (REAL)**
```sql
SELECT COUNT(*) as validationCompleted 
FROM documents 
WHERE status = 'APPROVED' 
  AND validated_at IS NOT NULL 
  AND validated_by IS NOT NULL;
```

### 2. **Validaciones Pendientes (REAL)**
```sql
SELECT COUNT(*) as validationPending 
FROM documents 
WHERE status = 'PENDING';
```

### 3. **Validaciones Rechazadas (REAL)**
```sql
SELECT COUNT(*) as validationRejected 
FROM documents 
WHERE status = 'REJECTED' 
  AND rejection_reason IS NOT NULL;
```

### 4. **Total de Documentos por Usuario (REAL)**
```sql
SELECT 
    u.dni,
    COUNT(d.id) as totalDocuments,
    COUNT(CASE WHEN d.status = 'APPROVED' THEN 1 END) as approvedDocs,
    COUNT(CASE WHEN d.status = 'PENDING' THEN 1 END) as pendingDocs,
    COUNT(CASE WHEN d.status = 'REJECTED' THEN 1 END) as rejectedDocs
FROM user_entity u
LEFT JOIN documents d ON LOWER(HEX(u.id)) = LOWER(HEX(d.user_id))
GROUP BY u.id, u.dni;
```

### 5. **Inscripciones con Documentos Completos (VERIFICACIÓN REAL)**
```sql
-- Verificar si una inscripción realmente tiene documentos completos
SELECT 
    i.id as inscription_id,
    LOWER(HEX(u.id)) as user_id,
    u.dni,
    i.status as inscription_status,
    COUNT(d.id) as total_documents,
    COUNT(CASE WHEN d.status = 'APPROVED' THEN 1 END) as approved_documents,
    COUNT(CASE WHEN d.status = 'PENDING' THEN 1 END) as pending_documents,
    COUNT(CASE WHEN d.status = 'REJECTED' THEN 1 END) as rejected_documents
FROM inscriptions i
JOIN user_entity u ON LOWER(HEX(i.user_id)) = LOWER(HEX(u.id))
LEFT JOIN documents d ON LOWER(HEX(u.id)) = LOWER(HEX(d.user_id))
WHERE i.status = 'COMPLETED_WITH_DOCS'
GROUP BY i.id, u.id, u.dni, i.status;
```

## IMPLEMENTACIÓN CORRECTA PARA POSTULATIONS/MANAGEMENT

### Función SQL Optimizada:
```typescript
async function getPostulationStatsReal(connection: mysql.Connection): Promise<PostulationsStats> {
  // Consulta única optimizada para obtener todas las estadísticas
  const [statsResult] = await connection.execute(`
    SELECT 
      -- Total de inscripciones elegibles
      COUNT(DISTINCT i.id) as total_inscriptions,
      
      -- Documentos por estado
      COUNT(CASE WHEN d.status = 'APPROVED' AND d.validated_at IS NOT NULL THEN d.id END) as validation_completed,
      COUNT(CASE WHEN d.status = 'PENDING' THEN d.id END) as validation_pending,
      COUNT(CASE WHEN d.status = 'REJECTED' THEN d.id END) as validation_rejected,
      
      -- Inscripciones por estado de validación
      COUNT(CASE WHEN i.status = 'COMPLETED_WITH_DOCS' THEN i.id END) as completed_with_docs
      
    FROM inscriptions i
    JOIN user_entity u ON LOWER(HEX(i.user_id)) = LOWER(HEX(u.id))
    LEFT JOIN documents d ON LOWER(HEX(u.id)) = LOWER(HEX(d.user_id))
    WHERE i.status = 'COMPLETED_WITH_DOCS'
  `);
  
  const stats = (statsResult as any[])[0];
  
  return {
    total: parseInt(stats.total_inscriptions) || 0,
    completedWithDocs: parseInt(stats.completed_with_docs) || 0,
    validationPending: parseInt(stats.validation_pending) || 0,
    validationCompleted: parseInt(stats.validation_completed) || 0,
    validationRejected: parseInt(stats.validation_rejected) || 0
  };
}
```

## DATOS ACTUALES VERIFICADOS (2025-08-18)

### Estado Real de la Base de Datos:
```
INSCRIPTIONS:
- COMPLETED_WITH_DOCS: 251
- COMPLETED_PENDING_DOCS: 9  
- ACTIVE: 31
- REJECTED: 1

DOCUMENTS:
- PENDING: 2,515
- REJECTED: 6
- APPROVED: 1  ⟵ REAL validationCompleted = 1, NO 62!
```

## CORRECCIÓN URGENTE REQUERIDA

**Reemplazar en**: `src/app/api/postulations/management/route.ts`

1. **Eliminar líneas 379-381** (estimaciones en calculateRealStats)
2. **Eliminar líneas 419-421** (estimaciones en estimatedStats)
3. **Implementar consultas SQL reales**
4. **Mantener caché pero con datos REALES**

