/**
 * Mapeo de nombres técnicos de tablas de base de datos a nombres amigables para el usuario
 */

export const TABLE_DISPLAY_NAMES: Record<string, string> = {
  // Tablas principales
  'documents': 'Documentos',
  'document_audit': 'Auditoría de Documentos', 
  'audit_logs': 'Registros de Auditoría',
  'user_roles': 'Roles de Usuario',
  'user_entity': 'Entidades de Usuario',
  'inscriptions': 'Inscripciones',
  'education_record': 'Registros Académicos',
  
  // Tablas de backup y corrección
  'documents_backup_paths_correction_20250812': 'Corrección de Rutas (12/08/2025)',
  'inscriptions_backup_accepted_terms_20250812': 'Backup Términos Aceptados (12/08/2025)',
  'documents_backup_response_day_20250813': 'Backup Respuestas (13/08/2025)',
  
  // Tablas del sistema
  'users': 'Usuarios',
  'sessions': 'Sesiones',
  'permissions': 'Permisos',
  'roles': 'Roles del Sistema',
  'settings': 'Configuraciones',
  'backups': 'Copias de Seguridad',
  'logs': 'Registros del Sistema',
  
  // Tablas de concursos
  'contests': 'Concursos',
  'contest_participants': 'Participantes de Concursos',
  'contest_results': 'Resultados de Concursos',
  'contest_documents': 'Documentos de Concursos',
  
  // Tablas de validación
  'validation_processes': 'Procesos de Validación',
  'validation_results': 'Resultados de Validación',
  'validation_comments': 'Comentarios de Validación',
  'validation_history': 'Historial de Validación',
  
  // Tablas de notificaciones
  'notifications': 'Notificaciones',
  'email_queue': 'Cola de Correos',
  'email_templates': 'Plantillas de Correo',
  
  // Tablas de métricas y estadísticas
  'statistics': 'Estadísticas',
  'performance_metrics': 'Métricas de Rendimiento',
  'usage_analytics': 'Análisis de Uso',
  
  // Tablas temporales o de migración
  'temp_migrations': 'Migraciones Temporales',
  'data_imports': 'Importación de Datos',
  'data_exports': 'Exportación de Datos',
};

/**
 * Obtiene el nombre amigable de una tabla
 * @param technicalName - Nombre técnico de la tabla
 * @returns Nombre amigable o el nombre técnico si no existe mapeo
 */
export function getTableDisplayName(technicalName: string): string {
  return TABLE_DISPLAY_NAMES[technicalName] || technicalName;
}

/**
 * Categoriza las tablas por tipo
 */
export const TABLE_CATEGORIES: Record<string, string[]> = {
  'Principales': ['documents', 'inscriptions', 'users', 'contests'],
  'Auditoría': ['document_audit', 'audit_logs', 'validation_history'],
  'Sistema': ['user_roles', 'user_entity', 'sessions', 'permissions'],
  'Educación': ['education_record'],
  'Backups': [
    'documents_backup_paths_correction_20250812',
    'inscriptions_backup_accepted_terms_20250812', 
    'documents_backup_response_day_20250813'
  ],
};

/**
 * Obtiene la categoría de una tabla
 * @param tableName - Nombre de la tabla
 * @returns Categoría de la tabla o 'Otras' si no se encuentra
 */
export function getTableCategory(tableName: string): string {
  for (const [category, tables] of Object.entries(TABLE_CATEGORIES)) {
    if (tables.includes(tableName)) {
      return category;
    }
  }
  return 'Otras';
}
