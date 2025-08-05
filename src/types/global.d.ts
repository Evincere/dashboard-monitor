// src/types/global.d.ts
// Declaraciones de tipos globales para el proyecto

declare module 'mysql2/promise' {
  export * from 'mysql2';
}

// Tipos para variables de entorno
declare namespace NodeJS {
  interface ProcessEnv {
    DB_HOST: string;
    DB_PORT: string;
    DB_USER: string;
    DB_PASSWORD: string;
    DB_DATABASE: string;
    SCHEMA_CACHE_DURATION?: string;
    GOOGLE_GENAI_API_KEY?: string;
    NEXT_PUBLIC_BASE_PATH?: string;
  }
}

// Tipos para el sistema de cache
interface CacheStatistics {
  hits: number;
  misses: number;
  lastHitTime: Date | null;
  lastMissTime: Date | null;
  lastClearTime: Date | null;
}

interface TableCacheEntry {
  data: any;
  timestamp: number;
}

// Tipos para el esquema de base de datos
interface DatabaseSchema {
  tables: Record<string, TableSchema>;
  views: Record<string, ViewSchema>;
  procedures: Record<string, ProcedureSchema>;
  functions: Record<string, FunctionSchema>;
}

interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  indexes: IndexSchema[];
  foreignKeys: ForeignKeySchema[];
  primaryKey: string[];
}

interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  default: any;
  comment: string;
}

interface IndexSchema {
  name: string;
  columns: string[];
  unique: boolean;
  type: string;
}

interface ForeignKeySchema {
  name: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onUpdate: string;
  onDelete: string;
}

interface ViewSchema {
  name: string;
  definition: string;
  columns: ColumnSchema[];
}

interface ProcedureSchema {
  name: string;
  parameters: ParameterSchema[];
  returnType?: string;
}

interface FunctionSchema {
  name: string;
  parameters: ParameterSchema[];
  returnType: string;
}

interface ParameterSchema {
  name: string;
  type: string;
  mode: 'IN' | 'OUT' | 'INOUT';
}

// Exportar tipos para uso en otros archivos
export type {
  CacheStatistics,
  TableCacheEntry,
  DatabaseSchema,
  TableSchema,
  ColumnSchema,
  IndexSchema,
  ForeignKeySchema,
  ViewSchema,
  ProcedureSchema,
  FunctionSchema,
  ParameterSchema
};