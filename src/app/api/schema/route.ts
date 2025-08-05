// src/app/api/schema/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getDbSchema, 
  getSchemaOverview, 
  getTableSchema,
  getTableForeignKeys,
  getTableIndexes,
  getTablePrimaryKey,
  getReferencingTables,
  getReferencedTables,
  getTableConstraints,
  getTablePrivileges,
  getTableTriggers,
  analyzeTableStorage,
  getDatabaseMetadata,
  validateSchemaIntegrity
} from '@/services/database';
import { getSchemaCacheInfo, clearSchemaCache } from '@/lib/database-utils';

/**
 * GET /api/schema - Get complete database schema or specific information
 * Query parameters:
 * - table: Get schema for specific table
 * - overview: Get schema overview summary
 * - cache: Get cache information
 * - refresh: Force refresh cache
 * - constraints: Get table constraints
 * - privileges: Get table privileges
 * - triggers: Get table triggers
 * - storage: Get storage analysis
 * - metadata: Get database metadata
 * - validate: Validate schema integrity
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const overview = searchParams.get('overview');
    const cache = searchParams.get('cache');
    const refresh = searchParams.get('refresh') === 'true';
    const constraints = searchParams.get('constraints');
    const privileges = searchParams.get('privileges');
    const triggers = searchParams.get('triggers');
    const storage = searchParams.get('storage');
    const metadata = searchParams.get('metadata');
    const validate = searchParams.get('validate');

    // Return cache information
    if (cache === 'info') {
      const cacheInfo = getSchemaCacheInfo();
      return NextResponse.json({
        success: true,
        data: cacheInfo
      });
    }

    // Return schema overview
    if (overview === 'true') {
      const schemaOverview = await getSchemaOverview();
      return NextResponse.json({
        success: true,
        data: schemaOverview
      });
    }

    // Return database metadata
    if (metadata === 'true') {
      const dbMetadata = await getDatabaseMetadata();
      return NextResponse.json({
        success: true,
        data: dbMetadata
      });
    }

    // Return schema validation
    if (validate === 'true') {
      const validation = await validateSchemaIntegrity();
      return NextResponse.json({
        success: true,
        data: validation
      });
    }

    // Return storage analysis
    if (storage === 'true') {
      const storageAnalysis = await analyzeTableStorage();
      return NextResponse.json({
        success: true,
        data: storageAnalysis
      });
    }

    // Return constraints
    if (constraints === 'true') {
      const tableConstraints = await getTableConstraints(table || undefined);
      return NextResponse.json({
        success: true,
        data: tableConstraints
      });
    }

    // Return privileges
    if (privileges === 'true') {
      const tablePrivileges = await getTablePrivileges(table || undefined);
      return NextResponse.json({
        success: true,
        data: tablePrivileges
      });
    }

    // Return triggers
    if (triggers === 'true') {
      const tableTriggers = await getTableTriggers(table || undefined);
      return NextResponse.json({
        success: true,
        data: tableTriggers
      });
    }

    // Return specific table schema
    if (table) {
      const tableSchema = await getTableSchema(table);
      if (!tableSchema) {
        return NextResponse.json({
          success: false,
          error: `Table '${table}' not found`
        }, { status: 404 });
      }

      const foreignKeys = await getTableForeignKeys(table);
      const indexes = await getTableIndexes(table);
      const primaryKey = await getTablePrimaryKey(table);
      const referencingTables = await getReferencingTables(table);
      const referencedTables = await getReferencedTables(table);
      const tableConstraints = await getTableConstraints(table);
      const tableTriggers = await getTableTriggers(table);

      return NextResponse.json({
        success: true,
        data: {
          table: tableSchema,
          foreignKeys,
          indexes,
          primaryKey,
          constraints: tableConstraints,
          triggers: tableTriggers,
          relationships: {
            referencingTables,
            referencedTables
          }
        }
      });
    }

    // Return complete schema
    const schema = await getDbSchema(refresh);
    return NextResponse.json({
      success: true,
      data: schema
    });

  } catch (error) {
    console.error('Schema API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/schema - Clear schema cache
 */
export async function DELETE() {
  try {
    clearSchemaCache();
    return NextResponse.json({
      success: true,
      message: 'Schema cache cleared successfully'
    });
  } catch (error) {
    console.error('Schema cache clear error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}