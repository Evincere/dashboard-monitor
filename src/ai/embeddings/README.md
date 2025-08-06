# Sistema de Memoria Persistente - Dashboard Monitor

## Descripción General

El sistema de memoria persistente es una implementación avanzada que extiende las capacidades del sistema de embeddings existente, proporcionando:

- **Almacenamiento persistente** de consultas previas y contexto
- **Búsqueda semántica** por similitud con ranking inteligente
- **Persistencia entre reinicios** del sistema mediante snapshots
- **Limpieza automática** de memoria antigua con preservación de contenido importante
- **Análisis de patrones** de búsqueda y uso

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    Sistema de Memoria Persistente               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ PersistentMemory│  │MemoryPersistence│  │ SemanticSearch  │  │
│  │    Manager      │  │    Service      │  │    Service      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ EmbeddingService│  │  VectorStorage  │  │SentenceTransform│  │
│  │   (Existente)   │  │   (Existente)   │  │  er (Existente) │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes Principales

### 1. PersistentMemoryManager

Gestor principal de memoria persistente que proporciona:

#### Funcionalidades Clave:
- **Almacenamiento inteligente** de pares consulta-respuesta
- **Búsqueda semántica avanzada** con filtros múltiples
- **Gestión de contexto** con categorización
- **Limpieza inteligente** que preserva contenido importante
- **Estadísticas detalladas** de uso de memoria
- **Detección de duplicados** para optimización

#### Configuración:
```typescript
const memoryManager = new PersistentMemoryManager({
  storageDir: './vector_store',
  maxMemoryAge: 30 * 24 * 60 * 60 * 1000, // 30 días
  maxMemoryEntries: 50000,
  cleanupInterval: 24 * 60 * 60 * 1000, // 24 horas
  similarityThreshold: 0.7,
  enableAutoCleanup: true,
  backupInterval: 7 * 24 * 60 * 60 * 1000, // 7 días
});
```

#### Uso Básico:
```typescript
// Almacenar consulta y respuesta
await memoryManager.storeQueryResponse(
  '¿Cuántos usuarios están registrados?',
  'Hay 1,234 usuarios registrados en el sistema.',
  {
    userId: 'admin-001',
    category: 'statistics',
    importance: 'medium',
    tags: ['usuarios', 'estadísticas']
  }
);

// Buscar memorias similares
const memories = await memoryManager.searchSimilarMemories({
  query: 'usuarios registrados',
  topK: 10,
  minSimilarity: 0.7,
  categories: ['statistics'],
  timeRange: {
    start: Date.now() - 7 * 24 * 60 * 60 * 1000, // Última semana
    end: Date.now()
  }
});
```

### 2. MemoryPersistenceService

Servicio de persistencia que garantiza la recuperación de memoria tras reinicios del sistema.

#### Funcionalidades Clave:
- **Snapshots automáticos** de memoria
- **Detección de reinicios** del sistema
- **Restauración automática** en startup
- **Gestión de múltiples snapshots** con limpieza automática
- **Compresión opcional** de datos

#### Configuración:
```typescript
const persistenceService = new MemoryPersistenceService({
  snapshotDir: './vector_store/snapshots',
  maxSnapshots: 10,
  snapshotInterval: 6 * 60 * 60 * 1000, // 6 horas
  enableAutoSnapshot: true,
  compressionEnabled: true,
});
```

#### Uso Básico:
```typescript
// Crear snapshot manual
const snapshotFile = await persistenceService.createSnapshot();

// Restaurar desde snapshot específico
await persistenceService.restoreFromSnapshot(snapshotFile);

// Obtener snapshots disponibles
const snapshots = await persistenceService.getAvailableSnapshots();
```

### 3. SemanticSearchService

Servicio de búsqueda semántica avanzada con análisis de patrones.

#### Funcionalidades Clave:
- **Búsqueda semántica** con ranking inteligente
- **Clustering de resultados** por similitud
- **Sugerencias de búsqueda** basadas en patrones
- **Análisis de tendencias** de búsqueda
- **Métricas de rendimiento** detalladas

#### Configuración y Uso:
```typescript
// Búsqueda semántica avanzada
const results = await searchService.search({
  query: 'crear nuevo concurso',
  topK: 10,
  minSimilarity: 0.6,
  searchTypes: ['query', 'response', 'context'],
  boostRecent: true,
  boostImportant: true,
  categoryFilter: ['help', 'documentation'],
  timeRange: {
    start: Date.now() - 30 * 24 * 60 * 60 * 1000,
    end: Date.now()
  }
});

// Obtener sugerencias de búsqueda
const suggestions = await searchService.getSearchSuggestions('concur', {
  maxSuggestions: 5,
  includePopular: true,
  includeRecent: true
});

// Analizar patrones de búsqueda
const analysis = await searchService.analyzeSearchPatterns();
```

## Inicialización del Sistema

### Startup Automático

El sistema se inicializa automáticamente durante el startup de la aplicación:

```typescript
// En src/ai/embeddings/startup.ts
export async function initializeEmbeddingSystem(): Promise<void> {
  // 1. Validar configuración
  // 2. Inicializar embedding service
  // 3. Inicializar persistent memory manager
  // 4. Inicializar memory persistence service
  // 5. Inicializar semantic search service
  // 6. Realizar restauración automática si es necesario
  // 7. Inicializar contexto de esquema de base de datos
}
```

### Configuración de Variables de Entorno

```bash
# Configuración del modelo de embeddings
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
EMBEDDING_DIMENSIONS=384
EMBEDDING_MAX_TOKENS=512
EMBEDDING_LANGUAGE=es
EMBEDDING_BATCH_SIZE=32
EMBEDDING_CACHE_DIR=./vector_store/models

# Configuración de memoria persistente
MEMORY_STORAGE_DIR=./vector_store
MEMORY_MAX_AGE=2592000000  # 30 días en ms
MEMORY_MAX_ENTRIES=50000
MEMORY_CLEANUP_INTERVAL=86400000  # 24 horas en ms
MEMORY_SIMILARITY_THRESHOLD=0.7

# Configuración de snapshots
SNAPSHOT_DIR=./vector_store/snapshots
SNAPSHOT_MAX_COUNT=10
SNAPSHOT_INTERVAL=21600000  # 6 horas en ms
SNAPSHOT_AUTO_ENABLED=true
```

## Mantenimiento del Sistema

### Limpieza Automática

El sistema realiza limpieza automática basada en:

- **Edad de las entradas**: Elimina entradas más antiguas que `maxMemoryAge`
- **Importancia del contenido**: Preserva entradas marcadas como importantes
- **Límite de entradas**: Mantiene un máximo de `maxMemoryEntries`
- **Tipo de contenido**: Preserva contexto de esquema de base de datos

### Mantenimiento Manual

```typescript
// Realizar mantenimiento completo
await performEmbeddingMaintenance();

// Limpieza inteligente específica
const cleanupResult = await memoryManager.performIntelligentCleanup();

// Crear backup manual
const backupFile = await memoryManager.createBackup();

// Verificar salud del sistema
const health = await checkEmbeddingHealth();
```

## Métricas y Monitoreo

### Estadísticas de Memoria

```typescript
const memoryStats = await memoryManager.getMemoryStats();
// Retorna:
// - totalEntries: número total de entradas
// - queriesCount: número de consultas almacenadas
// - responsesCount: número de respuestas almacenadas
// - contextCount: número de entradas de contexto
// - storageSize: tamaño en bytes del almacenamiento
// - oldestEntry: timestamp de la entrada más antigua
// - newestEntry: timestamp de la entrada más reciente
// - averageSimilarity: similitud promedio
// - lastCleanup: timestamp de última limpieza
// - lastBackup: timestamp de último backup
```

### Análisis de Búsquedas

```typescript
const searchAnalytics = searchService.getSearchAnalytics();
// Retorna:
// - totalSearches: número total de búsquedas
// - averageResultCount: promedio de resultados por búsqueda
// - commonQueries: consultas más frecuentes
// - performanceMetrics: métricas de rendimiento
```

### Verificación de Salud

```typescript
const health = await checkEmbeddingHealth();
// Verifica:
// - Configuración válida
// - Servicios inicializados correctamente
// - Estado de la base de datos vectorial
// - Rendimiento de búsquedas
// - Antigüedad de snapshots y backups
```

## Casos de Uso Específicos

### 1. Consultas Inteligentes con Memoria

```typescript
// El sistema recuerda consultas similares previas
const query = '¿Cuántos documentos han sido validados este mes?';

// Buscar en memoria antes de procesar
const similarMemories = await memoryManager.searchSimilarMemories({
  query,
  topK: 5,
  minSimilarity: 0.8,
  categories: ['statistics', 'documents']
});

if (similarMemories.length > 0) {
  // Usar respuesta de memoria si es suficientemente similar
  const bestMatch = similarMemories[0];
  if (bestMatch.similarity > 0.9) {
    return bestMatch.response;
  }
}

// Procesar nueva consulta y almacenar resultado
const newResponse = await processQuery(query);
await memoryManager.storeQueryResponse(query, newResponse, {
  category: 'statistics',
  importance: 'medium'
});
```

### 2. Contexto de Base de Datos

```typescript
// El sistema almacena automáticamente información del esquema
await memoryManager.storeContext(
  `Tabla: documentos
   Descripción: Almacena archivos cargados por postulantes
   Columnas:
   - id (int) [CLAVE PRIMARIA]
   - usuario_id (int) [CLAVE FORÁNEA → usuarios.id]
   - nombre_archivo (varchar)
   - tipo_documento (enum)
   - estado_validacion (enum: PENDIENTE, APROBADO, RECHAZADO)
   - fecha_carga (timestamp)`,
  {
    source: 'database-schema',
    category: 'schema',
    type: 'table-description',
    importance: 'high'
  }
);
```

### 3. Recuperación tras Reinicio

```typescript
// Al iniciar la aplicación
await persistenceService.performStartupRestoration();

// El sistema detecta automáticamente si hubo un reinicio
// y restaura la memoria desde el snapshot más reciente
```

## Optimizaciones de Rendimiento

### 1. Configuración de Embeddings

- **Modelo optimizado**: `paraphrase-multilingual-MiniLM-L12-v2` para español
- **Dimensiones balanceadas**: 384 dimensiones (calidad vs rendimiento)
- **Procesamiento por lotes**: Batch size de 32 para eficiencia
- **Cache local**: Modelos almacenados localmente

### 2. Gestión de Memoria

- **Limpieza inteligente**: Preserva contenido importante automáticamente
- **Compresión de snapshots**: Reduce espacio de almacenamiento
- **Índices optimizados**: Búsqueda rápida por similitud
- **Pool de conexiones**: Acceso eficiente a base de datos

### 3. Búsqueda Semántica

- **Ranking inteligente**: Combina similitud, recencia e importancia
- **Filtros eficientes**: Reduce espacio de búsqueda
- **Cache de resultados**: Evita recálculos innecesarios
- **Clustering automático**: Agrupa resultados similares

## Consideraciones de Seguridad

### 1. Datos Sensibles

- **Anonimización**: Los snapshots pueden anonimizar datos sensibles
- **Cifrado opcional**: Backups pueden ser cifrados
- **Acceso controlado**: Filtros por usuario y sesión
- **Auditoría**: Logs de acceso a memoria sensible

### 2. Integridad de Datos

- **Validación de snapshots**: Verificación de integridad
- **Backups múltiples**: Redundancia de datos críticos
- **Recuperación robusta**: Manejo de errores en restauración
- **Limpieza segura**: Preservación de datos importantes

## Troubleshooting

### Problemas Comunes

1. **Modelo de embeddings no se descarga**
   - Verificar conectividad a internet
   - Comprobar espacio en disco
   - Revisar permisos de escritura en cache_dir

2. **Memoria crece demasiado**
   - Ajustar `maxMemoryEntries` y `maxMemoryAge`
   - Habilitar limpieza automática
   - Revisar configuración de importancia

3. **Búsquedas lentas**
   - Reducir `topK` en búsquedas
   - Aumentar `minSimilarity` para filtrar más
   - Verificar índices de base de datos vectorial

4. **Snapshots fallan**
   - Verificar permisos de escritura
   - Comprobar espacio en disco
   - Revisar configuración de directorios

### Logs y Debugging

El sistema proporciona logs detallados:

```
🚀 Starting embedding system initialization...
✅ Embedding configuration validated
📋 Using model: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
🧠 Persistent memory manager initialized
💾 Memory Persistence Service initialized
🔍 Semantic Search Service initialized
📊 Memory initialized with 1,234 documents
🎉 Embedding system initialization completed successfully!
```

## Testing

### Tests Unitarios

```bash
# Ejecutar tests del sistema de memoria persistente
npm test -- --run src/__tests__/persistent-memory-unit.test.ts
```

### Tests de Integración

Los tests verifican:
- Almacenamiento y recuperación de memoria
- Búsqueda semántica con filtros
- Creación y restauración de snapshots
- Limpieza inteligente de memoria
- Análisis de patrones de búsqueda
- Manejo de errores y casos edge

## Roadmap Futuro

### Mejoras Planificadas

1. **Compresión Avanzada**: Algoritmos de compresión más eficientes
2. **Distribución**: Soporte para múltiples nodos
3. **ML Adaptativo**: Aprendizaje automático de patrones de uso
4. **APIs REST**: Endpoints para gestión externa
5. **Dashboard**: Interfaz web para monitoreo y gestión
6. **Integración Cloud**: Soporte para almacenamiento en la nube

### Optimizaciones Técnicas

1. **Índices Vectoriales**: FAISS o Annoy para búsquedas más rápidas
2. **Streaming**: Procesamiento de grandes volúmenes de datos
3. **Paralelización**: Procesamiento concurrente de embeddings
4. **Cache Distribuido**: Redis para cache compartido
5. **Métricas Avanzadas**: Prometheus/Grafana para monitoreo

---

Este sistema de memoria persistente proporciona una base sólida para el desarrollo de capacidades de IA más avanzadas, manteniendo la eficiencia y confiabilidad necesarias para un entorno de producción.