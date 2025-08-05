// src/lib/schema-utils.ts
import { SchemaDetails, TableDetails, ForeignKey, IndexDetails } from '@/services/database';

/**
 * Analyzes table relationships and returns a dependency graph
 */
export function buildTableDependencyGraph(schema: SchemaDetails): Map<string, string[]> {
  const dependencies = new Map<string, string[]>();
  
  // Initialize all tables
  schema.tables.forEach(table => {
    dependencies.set(table.name, []);
  });
  
  // Add dependencies based on foreign keys
  schema.foreignKeys.forEach(fk => {
    const deps = dependencies.get(fk.fromTable) || [];
    if (!deps.includes(fk.toTable)) {
      deps.push(fk.toTable);
      dependencies.set(fk.fromTable, deps);
    }
  });
  
  return dependencies;
}

/**
 * Finds circular dependencies in the schema
 */
export function findCircularDependencies(schema: SchemaDetails): string[][] {
  const graph = buildTableDependencyGraph(schema);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];
  
  function dfs(node: string, path: string[]): void {
    if (recursionStack.has(node)) {
      // Found a cycle
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        cycles.push(path.slice(cycleStart).concat(node));
      }
      return;
    }
    
    if (visited.has(node)) {
      return;
    }
    
    visited.add(node);
    recursionStack.add(node);
    
    const dependencies = graph.get(node) || [];
    dependencies.forEach(dep => {
      dfs(dep, [...path, node]);
    });
    
    recursionStack.delete(node);
  }
  
  graph.forEach((_, table) => {
    if (!visited.has(table)) {
      dfs(table, []);
    }
  });
  
  return cycles;
}

/**
 * Calculates table complexity score based on columns, indexes, and relationships
 */
export function calculateTableComplexity(table: TableDetails, schema: SchemaDetails): number {
  let score = 0;
  
  // Base score from columns
  score += table.columns.length;
  
  // Add score for each index
  const tableIndexes = schema.indexes.filter(idx => idx.tableName === table.name);
  score += tableIndexes.length * 2;
  
  // Add score for foreign key relationships
  const tableForeignKeys = schema.foreignKeys.filter(
    fk => fk.fromTable === table.name || fk.toTable === table.name
  );
  score += tableForeignKeys.length * 3;
  
  // Add score for complex column types
  table.columns.forEach(column => {
    if (['json', 'text', 'longtext', 'blob', 'longblob'].includes(column.type.toLowerCase())) {
      score += 2;
    }
  });
  
  return score;
}

/**
 * Identifies orphaned tables (tables with no relationships)
 */
export function findOrphanedTables(schema: SchemaDetails): string[] {
  const tablesWithRelationships = new Set<string>();
  
  schema.foreignKeys.forEach(fk => {
    tablesWithRelationships.add(fk.fromTable);
    tablesWithRelationships.add(fk.toTable);
  });
  
  return schema.tables
    .filter(table => !tablesWithRelationships.has(table.name))
    .map(table => table.name);
}

/**
 * Analyzes index usage and identifies potential optimization opportunities
 */
export function analyzeIndexOptimization(schema: SchemaDetails): {
  duplicateIndexes: Array<{
    table: string;
    indexes: string[];
    columns: string[];
  }>;
  unusedIndexes: Array<{
    table: string;
    index: string;
    reason: string;
  }>;
  missingIndexes: Array<{
    table: string;
    column: string;
    reason: string;
  }>;
} {
  const duplicateIndexes: Array<{
    table: string;
    indexes: string[];
    columns: string[];
  }> = [];
  
  const unusedIndexes: Array<{
    table: string;
    index: string;
    reason: string;
  }> = [];
  
  const missingIndexes: Array<{
    table: string;
    column: string;
    reason: string;
  }> = [];
  
  // Group indexes by table
  const indexesByTable = schema.indexes.reduce((acc, index) => {
    if (!acc[index.tableName]) {
      acc[index.tableName] = [];
    }
    acc[index.tableName].push(index);
    return acc;
  }, {} as Record<string, IndexDetails[]>);
  
  // Find duplicate indexes
  Object.entries(indexesByTable).forEach(([tableName, indexes]) => {
    const columnCombinations = new Map<string, string[]>();
    
    indexes.forEach(index => {
      const columnKey = index.columns.sort().join(',');
      if (!columnCombinations.has(columnKey)) {
        columnCombinations.set(columnKey, []);
      }
      columnCombinations.get(columnKey)!.push(index.indexName);
    });
    
    columnCombinations.forEach((indexNames, columns) => {
      if (indexNames.length > 1) {
        duplicateIndexes.push({
          table: tableName,
          indexes: indexNames,
          columns: columns.split(','),
        });
      }
    });
  });
  
  // Find foreign key columns without indexes
  schema.foreignKeys.forEach(fk => {
    const tableIndexes = indexesByTable[fk.fromTable] || [];
    const hasIndex = tableIndexes.some(index => 
      index.columns.includes(fk.fromColumn)
    );
    
    if (!hasIndex) {
      missingIndexes.push({
        table: fk.fromTable,
        column: fk.fromColumn,
        reason: 'Foreign key column without index',
      });
    }
  });
  
  return {
    duplicateIndexes,
    unusedIndexes,
    missingIndexes,
  };
}

/**
 * Generates SQL suggestions based on schema analysis
 */
export function generateSchemaSuggestions(schema: SchemaDetails): string[] {
  const suggestions: string[] = [];
  
  // Check for tables without primary keys
  schema.tables.forEach(table => {
    const hasPrimaryKey = schema.indexes.some(
      index => index.tableName === table.name && index.isPrimary
    );
    
    if (!hasPrimaryKey) {
      suggestions.push(`Consider adding a primary key to table '${table.name}'`);
    }
  });
  
  // Check for foreign keys without indexes
  const indexOptimization = analyzeIndexOptimization(schema);
  indexOptimization.missingIndexes.forEach(missing => {
    suggestions.push(
      `Add index on '${missing.table}.${missing.column}' for better foreign key performance`
    );
  });
  
  // Check for duplicate indexes
  indexOptimization.duplicateIndexes.forEach(duplicate => {
    suggestions.push(
      `Remove duplicate indexes on '${duplicate.table}': ${duplicate.indexes.join(', ')}`
    );
  });
  
  // Check for orphaned tables
  const orphanedTables = findOrphanedTables(schema);
  orphanedTables.forEach(table => {
    suggestions.push(`Table '${table}' has no relationships - verify if this is intentional`);
  });
  
  // Check for circular dependencies
  const circularDeps = findCircularDependencies(schema);
  circularDeps.forEach(cycle => {
    suggestions.push(`Circular dependency detected: ${cycle.join(' → ')}`);
  });
  
  return suggestions;
}

/**
 * Formats table size information for display
 */
export function formatTableSize(table: TableDetails): {
  dataSize: string;
  indexSize: string;
  totalSize: string;
  avgRowSize: string;
} {
  const formatBytes = (bytes: number | null): string => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };
  
  const dataSize = formatBytes(table.dataLength);
  const indexSize = formatBytes(table.indexLength);
  const totalSize = formatBytes((table.dataLength || 0) + (table.indexLength || 0));
  const avgRowSize = formatBytes(table.avgRowLength);
  
  return {
    dataSize,
    indexSize,
    totalSize,
    avgRowSize,
  };
}

/**
 * Extracts table statistics for analysis
 */
export function getTableStatistics(schema: SchemaDetails): {
  totalTables: number;
  totalColumns: number;
  totalIndexes: number;
  totalForeignKeys: number;
  averageColumnsPerTable: number;
  averageIndexesPerTable: number;
  largestTable: { name: string; columns: number } | null;
  mostComplexTable: { name: string; score: number } | null;
} {
  const totalTables = schema.tables.length;
  const totalColumns = schema.tables.reduce((sum, table) => sum + table.columns.length, 0);
  const totalIndexes = schema.indexes.length;
  const totalForeignKeys = schema.foreignKeys.length;
  
  const averageColumnsPerTable = totalTables > 0 ? totalColumns / totalTables : 0;
  const averageIndexesPerTable = totalTables > 0 ? totalIndexes / totalTables : 0;
  
  let largestTable: { name: string; columns: number } | null = null;
  let mostComplexTable: { name: string; score: number } | null = null;
  
  schema.tables.forEach(table => {
    // Find largest table by column count
    if (!largestTable || table.columns.length > largestTable.columns) {
      largestTable = { name: table.name, columns: table.columns.length };
    }
    
    // Find most complex table
    const complexity = calculateTableComplexity(table, schema);
    if (!mostComplexTable || complexity > mostComplexTable.score) {
      mostComplexTable = { name: table.name, score: complexity };
    }
  });
  
  return {
    totalTables,
    totalColumns,
    totalIndexes,
    totalForeignKeys,
    averageColumnsPerTable: Math.round(averageColumnsPerTable * 100) / 100,
    averageIndexesPerTable: Math.round(averageIndexesPerTable * 100) / 100,
    largestTable,
    mostComplexTable,
  };
}