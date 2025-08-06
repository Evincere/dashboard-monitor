// src/ai/embeddings/schema-context.ts

/**
 * @fileOverview Database schema context initialization for embeddings
 */

import { getEmbeddingService } from './service';
import { getDatabaseConnection } from '@/services/database';

export interface TableInfo {
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    key: string;
    default: any;
    extra: string;
  }>;
  relationships: Array<{
    column: string;
    referencedTable: string;
    referencedColumn: string;
  }>;
  indexes: Array<{
    name: string;
    columns: string[];
    unique: boolean;
  }>;
}

/**
 * Initialize database schema context in the embedding system
 */
export async function initializeSchemaContext(): Promise<void> {
  try {
    console.log('🗄️ Initializing database schema context...');
    
    const embeddingService = await getEmbeddingService();
    const db = await getDatabaseConnection();

    // Get all tables
    const [tables] = await db.execute(`
      SELECT TABLE_NAME, TABLE_COMMENT
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `) as any[];

    console.log(`📊 Found ${tables.length} tables to process`);

    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      const tableComment = table.TABLE_COMMENT || '';

      try {
        // Get table structure
        const tableInfo = await getTableInfo(db, tableName);
        
        // Create comprehensive context text
        const contextText = buildTableContextText(tableInfo, tableComment);
        
        // Store in embedding system
        await embeddingService.storeContext(contextText, {
          source: 'database-schema',
          type: 'table-description',
          category: 'schema',
          tableName,
          timestamp: Date.now(),
        });

        console.log(`✅ Stored context for table: ${tableName}`);
      } catch (error) {
        console.error(`❌ Failed to process table ${tableName}:`, error);
      }
    }

    // Store general database information
    await storeGeneralDatabaseContext(db, embeddingService);

    console.log('🎉 Database schema context initialization completed');
  } catch (error) {
    console.error('❌ Failed to initialize schema context:', error);
    throw error;
  }
}

/**
 * Get detailed table information
 */
async function getTableInfo(db: any, tableName: string): Promise<TableInfo> {
  // Get columns
  const [columns] = await db.execute(`
    SELECT 
      COLUMN_NAME as name,
      DATA_TYPE as type,
      IS_NULLABLE as nullable,
      COLUMN_KEY as \`key\`,
      COLUMN_DEFAULT as \`default\`,
      EXTRA as extra,
      COLUMN_COMMENT as comment
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    ORDER BY ORDINAL_POSITION
  `, [tableName]) as any[];

  // Get foreign key relationships
  const [relationships] = await db.execute(`
    SELECT 
      COLUMN_NAME as column_name,
      REFERENCED_TABLE_NAME as referenced_table,
      REFERENCED_COLUMN_NAME as referenced_column
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = ? 
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `, [tableName]) as any[];

  // Get indexes
  const [indexes] = await db.execute(`
    SELECT 
      INDEX_NAME as name,
      COLUMN_NAME as column_name,
      NON_UNIQUE as non_unique
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    ORDER BY INDEX_NAME, SEQ_IN_INDEX
  `, [tableName]) as any[];

  // Group indexes by name
  const indexMap = new Map<string, { columns: string[]; unique: boolean }>();
  for (const index of indexes) {
    if (!indexMap.has(index.name)) {
      indexMap.set(index.name, {
        columns: [],
        unique: index.non_unique === 0,
      });
    }
    indexMap.get(index.name)!.columns.push(index.column_name);
  }

  return {
    tableName,
    columns: columns.map((col: any) => ({
      name: col.name,
      type: col.type,
      nullable: col.nullable === 'YES',
      key: col.key,
      default: col.default,
      extra: col.extra,
    })),
    relationships: relationships.map((rel: any) => ({
      column: rel.column_name,
      referencedTable: rel.referenced_table,
      referencedColumn: rel.referenced_column,
    })),
    indexes: Array.from(indexMap.entries()).map(([name, info]) => ({
      name,
      columns: info.columns,
      unique: info.unique,
    })),
  };
}

/**
 * Build comprehensive context text for a table
 */
function buildTableContextText(tableInfo: TableInfo, comment: string): string {
  const { tableName, columns, relationships, indexes } = tableInfo;
  
  let context = `Tabla: ${tableName}\n`;
  
  if (comment) {
    context += `Descripción: ${comment}\n`;
  }
  
  context += '\nColumnas:\n';
  for (const col of columns) {
    context += `- ${col.name} (${col.type})`;
    if (col.key === 'PRI') context += ' [CLAVE PRIMARIA]';
    if (col.key === 'UNI') context += ' [ÚNICO]';
    if (!col.nullable) context += ' [NO NULO]';
    if (col.extra) context += ` [${col.extra}]`;
    context += '\n';
  }
  
  if (relationships.length > 0) {
    context += '\nRelaciones (Claves Foráneas):\n';
    for (const rel of relationships) {
      context += `- ${rel.column} → ${rel.referencedTable}.${rel.referencedColumn}\n`;
    }
  }
  
  if (indexes.length > 0) {
    context += '\nÍndices:\n';
    for (const idx of indexes) {
      context += `- ${idx.name} (${idx.columns.join(', ')})`;
      if (idx.unique) context += ' [ÚNICO]';
      context += '\n';
    }
  }
  
  // Add usage examples
  context += '\nEjemplos de consultas comunes:\n';
  context += `- SELECT * FROM ${tableName} LIMIT 10;\n`;
  context += `- SELECT COUNT(*) FROM ${tableName};\n`;
  
  if (relationships.length > 0) {
    const firstRel = relationships[0];
    context += `- SELECT * FROM ${tableName} t JOIN ${firstRel.referencedTable} r ON t.${firstRel.column} = r.${firstRel.referencedColumn};\n`;
  }
  
  return context;
}

/**
 * Store general database context information
 */
async function storeGeneralDatabaseContext(db: any, embeddingService: any): Promise<void> {
  // Database overview
  const [dbInfo] = await db.execute(`
    SELECT 
      DATABASE() as database_name,
      COUNT(*) as table_count
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = DATABASE()
  `) as any[];

  const overviewContext = `
Base de datos: ${dbInfo[0].database_name}
Sistema de gestión de concursos del Ministerio Público de la Defensa

Información general:
- Total de tablas: ${dbInfo[0].table_count}
- Sistema de concursos públicos
- Gestión de usuarios, postulantes y documentos
- Almacenamiento de inscripciones y evaluaciones

Funcionalidades principales:
- Registro y gestión de usuarios
- Creación y administración de concursos
- Carga y validación de documentos
- Sistema de inscripciones
- Evaluación y seguimiento de postulantes
- Generación de reportes y estadísticas

Tipos de consultas comunes:
- Estadísticas de usuarios y concursos
- Búsqueda de documentos por usuario o concurso
- Análisis de inscripciones y participación
- Reportes de estado de concursos
- Validación de documentos y requisitos
`;

  await embeddingService.storeContext(overviewContext, {
    source: 'database-schema',
    type: 'database-overview',
    category: 'general',
    timestamp: Date.now(),
  });

  // Common query patterns
  const queryPatternsContext = `
Patrones de consulta comunes en el sistema MPD Concursos:

1. Consultas de usuarios:
   - Buscar usuarios por email, nombre o rol
   - Contar usuarios activos/inactivos
   - Listar usuarios por fecha de registro

2. Consultas de concursos:
   - Listar concursos activos o por estado
   - Buscar concursos por fecha o categoría
   - Obtener estadísticas de participación

3. Consultas de documentos:
   - Buscar documentos por usuario o concurso
   - Validar estado de documentos
   - Obtener estadísticas de carga de archivos

4. Consultas de inscripciones:
   - Listar inscripciones por concurso
   - Buscar postulantes por estado
   - Generar reportes de participación

5. Consultas analíticas:
   - Tendencias de registro de usuarios
   - Análisis de participación en concursos
   - Estadísticas de uso del sistema
   - Reportes de documentos por tipo y estado
`;

  await embeddingService.storeContext(queryPatternsContext, {
    source: 'database-schema',
    type: 'query-patterns',
    category: 'examples',
    timestamp: Date.now(),
  });

  console.log('✅ Stored general database context');
}

/**
 * Update schema context (call this when schema changes)
 */
export async function updateSchemaContext(): Promise<void> {
  console.log('🔄 Updating schema context...');
  
  // Clean up old schema context
  const embeddingService = await getEmbeddingService();
  await embeddingService.cleanupMemory({
    maxAge: 1, // Remove all old entries
    keepImportantQueries: true,
  });
  
  // Reinitialize
  await initializeSchemaContext();
}