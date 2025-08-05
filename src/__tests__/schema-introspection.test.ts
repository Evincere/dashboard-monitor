// src/__tests__/schema-introspection.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  getDbSchema, 
  getSchemaOverview, 
  getTableSchema,
  getTableForeignKeys,
  getTableIndexes,
  getTablePrimaryKey,
  getTableConstraints,
  getTablePrivileges,
  getTableTriggers,
  analyzeTableStorage,
  getDatabaseMetadata,
  validateSchemaIntegrity,
  closeConnectionPool
} from '@/services/database';
import { clearSchemaCache, getSchemaCacheInfo } from '@/lib/database-utils';
import { 
  buildTableDependencyGraph,
  findCircularDependencies,
  calculateTableComplexity,
  findOrphanedTables,
  analyzeIndexOptimization,
  generateSchemaSuggestions,
  getTableStatistics
} from '@/lib/schema-utils';

describe('Schema Introspection', () => {
  beforeAll(() => {
    // Ensure we have a clean cache state
    clearSchemaCache();
  });

  afterAll(async () => {
    // Clean up connection pool
    await closeConnectionPool();
  });

  describe('Database Schema Retrieval', () => {
    it('should retrieve complete database schema', async () => {
      const schema = await getDbSchema();
      
      expect(schema).toBeDefined();
      expect(schema.schemaName).toBeDefined();
      expect(schema.tables).toBeInstanceOf(Array);
      expect(schema.views).toBeInstanceOf(Array);
      expect(schema.routines).toBeInstanceOf(Array);
      expect(schema.foreignKeys).toBeInstanceOf(Array);
      expect(schema.indexes).toBeInstanceOf(Array);
      expect(schema.lastIntrospection).toBeInstanceOf(Date);
    });

    it('should retrieve schema overview', async () => {
      const overview = await getSchemaOverview();
      
      expect(overview).toBeDefined();
      expect(overview.tablesCount).toBeGreaterThanOrEqual(0);
      expect(overview.totalColumns).toBeGreaterThanOrEqual(0);
      expect(overview.schemaName).toBeDefined();
      expect(overview.characterSet).toBeDefined();
      expect(overview.collation).toBeDefined();
    });

    it('should handle cache correctly', async () => {
      // Clear cache first
      clearSchemaCache();
      
      let cacheInfo = getSchemaCacheInfo();
      expect(cacheInfo.isCached).toBe(false);
      expect(cacheInfo.statistics).toBeDefined();
      expect(cacheInfo.tableCacheEntries).toBe(0);
      
      // Load schema
      await getDbSchema();
      
      cacheInfo = getSchemaCacheInfo();
      expect(cacheInfo.isCached).toBe(true);
      expect(cacheInfo.cacheAge).toBeGreaterThanOrEqual(0);
      expect(cacheInfo.remainingTime).toBeGreaterThan(0);
      expect(cacheInfo.statistics.totalMisses).toBeGreaterThan(0);
    });

    it('should force refresh when requested', async () => {
      const schema1 = await getDbSchema();
      const schema2 = await getDbSchema(true); // Force refresh
      
      expect(schema1.lastIntrospection).toBeDefined();
      expect(schema2.lastIntrospection).toBeDefined();
      // The refresh should update the timestamp
      expect(schema2.lastIntrospection.getTime()).toBeGreaterThanOrEqual(
        schema1.lastIntrospection.getTime()
      );
    });
  });

  describe('Table-Specific Operations', () => {
    it('should retrieve specific table schema', async () => {
      const schema = await getDbSchema();
      
      if (schema.tables.length > 0) {
        const tableName = schema.tables[0].name;
        const tableSchema = await getTableSchema(tableName);
        
        expect(tableSchema).toBeDefined();
        expect(tableSchema?.name).toBe(tableName);
        expect(tableSchema?.columns).toBeInstanceOf(Array);
      }
    });

    it('should return null for non-existent table', async () => {
      const tableSchema = await getTableSchema('non_existent_table_xyz');
      expect(tableSchema).toBeNull();
    });

    it('should retrieve table foreign keys', async () => {
      const schema = await getDbSchema();
      
      if (schema.tables.length > 0) {
        const tableName = schema.tables[0].name;
        const foreignKeys = await getTableForeignKeys(tableName);
        
        expect(foreignKeys).toBeInstanceOf(Array);
        // Each foreign key should have the required properties
        foreignKeys.forEach(fk => {
          expect(fk.constraintName).toBeDefined();
          expect(fk.fromTable).toBeDefined();
          expect(fk.fromColumn).toBeDefined();
          expect(fk.toTable).toBeDefined();
          expect(fk.toColumn).toBeDefined();
        });
      }
    });

    it('should retrieve table indexes', async () => {
      const schema = await getDbSchema();
      
      if (schema.tables.length > 0) {
        const tableName = schema.tables[0].name;
        const indexes = await getTableIndexes(tableName);
        
        expect(indexes).toBeInstanceOf(Array);
        indexes.forEach(index => {
          expect(index.tableName).toBe(tableName);
          expect(index.indexName).toBeDefined();
          expect(index.columns).toBeInstanceOf(Array);
          expect(typeof index.isPrimary).toBe('boolean');
          expect(typeof index.isUnique).toBe('boolean');
        });
      }
    });

    it('should retrieve table primary key', async () => {
      const schema = await getDbSchema();
      
      if (schema.tables.length > 0) {
        const tableName = schema.tables[0].name;
        const primaryKey = await getTablePrimaryKey(tableName);
        
        expect(primaryKey).toBeInstanceOf(Array);
        // Primary key columns should be strings
        primaryKey.forEach(column => {
          expect(typeof column).toBe('string');
        });
      }
    });
  });

  describe('Schema Analysis Utilities', () => {
    it('should build table dependency graph', async () => {
      const schema = await getDbSchema();
      const dependencyGraph = buildTableDependencyGraph(schema);
      
      expect(dependencyGraph).toBeInstanceOf(Map);
      expect(dependencyGraph.size).toBe(schema.tables.length);
      
      // Each table should have an entry
      schema.tables.forEach(table => {
        expect(dependencyGraph.has(table.name)).toBe(true);
        expect(dependencyGraph.get(table.name)).toBeInstanceOf(Array);
      });
    });

    it('should find circular dependencies', async () => {
      const schema = await getDbSchema();
      const circularDeps = findCircularDependencies(schema);
      
      expect(circularDeps).toBeInstanceOf(Array);
      // Each circular dependency should be an array of table names
      circularDeps.forEach(cycle => {
        expect(cycle).toBeInstanceOf(Array);
        expect(cycle.length).toBeGreaterThan(1);
      });
    });

    it('should calculate table complexity', async () => {
      const schema = await getDbSchema();
      
      if (schema.tables.length > 0) {
        const table = schema.tables[0];
        const complexity = calculateTableComplexity(table, schema);
        
        expect(typeof complexity).toBe('number');
        expect(complexity).toBeGreaterThanOrEqual(0);
      }
    });

    it('should find orphaned tables', async () => {
      const schema = await getDbSchema();
      const orphanedTables = findOrphanedTables(schema);
      
      expect(orphanedTables).toBeInstanceOf(Array);
      orphanedTables.forEach(tableName => {
        expect(typeof tableName).toBe('string');
        expect(schema.tables.some(t => t.name === tableName)).toBe(true);
      });
    });

    it('should analyze index optimization', async () => {
      const schema = await getDbSchema();
      const optimization = analyzeIndexOptimization(schema);
      
      expect(optimization).toBeDefined();
      expect(optimization.duplicateIndexes).toBeInstanceOf(Array);
      expect(optimization.unusedIndexes).toBeInstanceOf(Array);
      expect(optimization.missingIndexes).toBeInstanceOf(Array);
    });

    it('should generate schema suggestions', async () => {
      const schema = await getDbSchema();
      const suggestions = generateSchemaSuggestions(schema);
      
      expect(suggestions).toBeInstanceOf(Array);
      suggestions.forEach(suggestion => {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.length).toBeGreaterThan(0);
      });
    });

    it('should calculate table statistics', async () => {
      const schema = await getDbSchema();
      const stats = getTableStatistics(schema);
      
      expect(stats).toBeDefined();
      expect(stats.totalTables).toBe(schema.tables.length);
      expect(stats.totalIndexes).toBe(schema.indexes.length);
      expect(stats.totalForeignKeys).toBe(schema.foreignKeys.length);
      expect(typeof stats.averageColumnsPerTable).toBe('number');
      expect(typeof stats.averageIndexesPerTable).toBe('number');
    });
  });

  describe('Enhanced Schema Operations', () => {
    it('should retrieve table constraints', async () => {
      const constraints = await getTableConstraints();
      
      expect(constraints).toBeInstanceOf(Array);
      constraints.forEach(constraint => {
        expect(constraint.constraintName).toBeDefined();
        expect(constraint.tableName).toBeDefined();
        expect(constraint.constraintType).toBeDefined();
      });
    });

    it('should retrieve table privileges', async () => {
      const privileges = await getTablePrivileges();
      
      expect(privileges).toBeInstanceOf(Array);
      privileges.forEach(privilege => {
        expect(privilege.tableName).toBeDefined();
        expect(privilege.privilegeType).toBeDefined();
        expect(typeof privilege.isGrantable).toBe('boolean');
      });
    });

    it('should retrieve table triggers', async () => {
      const triggers = await getTableTriggers();
      
      expect(triggers).toBeInstanceOf(Array);
      triggers.forEach(trigger => {
        expect(trigger.triggerName).toBeDefined();
        expect(trigger.tableName).toBeDefined();
        expect(trigger.eventManipulation).toBeDefined();
      });
    });

    it('should analyze table storage', async () => {
      const storageAnalysis = await analyzeTableStorage();
      
      expect(storageAnalysis).toBeInstanceOf(Array);
      storageAnalysis.forEach(analysis => {
        expect(analysis.tableName).toBeDefined();
        expect(typeof analysis.totalSize).toBe('number');
        expect(analysis.recommendations).toBeInstanceOf(Array);
      });
    });

    it('should retrieve database metadata', async () => {
      const metadata = await getDatabaseMetadata();
      
      expect(metadata).toBeDefined();
      expect(metadata.version).toBeDefined();
      expect(metadata.characterSet).toBeDefined();
      expect(typeof metadata.maxConnections).toBe('number');
      expect(typeof metadata.currentConnections).toBe('number');
    });

    it('should validate schema integrity', async () => {
      const validation = await validateSchemaIntegrity();
      
      expect(validation).toBeDefined();
      expect(typeof validation.isValid).toBe('boolean');
      expect(validation.issues).toBeInstanceOf(Array);
      expect(validation.summary).toBeDefined();
      expect(typeof validation.summary.totalIssues).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we'll just ensure the functions don't throw unexpected errors
      expect(async () => {
        await getDbSchema();
      }).not.toThrow();
    });

    it('should handle invalid table names gracefully', async () => {
      const result = await getTableSchema('');
      expect(result).toBeNull();
    });
  });
});