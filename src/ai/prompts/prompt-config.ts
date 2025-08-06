// src/ai/prompts/prompt-config.ts

/**
 * @fileOverview Configuration system for specialized prompts
 * Manages prompt templates, parameters, and optimization settings
 */

import { SupportedProvider } from '@/ai/providers/types';

// ============================================================================
// PROMPT CONFIGURATION INTERFACES
// ============================================================================

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: PromptCategory;
  template: string;
  parameters: PromptParameter[];
  defaultConfig: PromptExecutionConfig;
  examples?: PromptExample[];
  metadata: PromptMetadata;
}

export interface PromptParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: string[];
  };
}

export interface PromptExecutionConfig {
  provider?: SupportedProvider;
  temperature: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  timeout?: number;
  retries?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

export interface PromptExample {
  name: string;
  description: string;
  input: Record<string, any>;
  expectedOutput: Record<string, any>;
  executionConfig?: Partial<PromptExecutionConfig>;
}

export interface PromptMetadata {
  version: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  performance: {
    avgExecutionTime?: number;
    successRate?: number;
    qualityScore?: number;
  };
}

export type PromptCategory = 
  | 'intent_discovery'
  | 'sql_generation'
  | 'context_analysis'
  | 'iterative_resolution'
  | 'quality_assessment'
  | 'error_handling'
  | 'data_validation'
  | 'response_synthesis';

// ============================================================================
// SPECIALIZED PROMPT TEMPLATES
// ============================================================================

export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  // Intent Discovery Templates
  intent_classifier_v2: {
    id: 'intent_classifier_v2',
    name: 'Advanced Intent Classifier',
    description: 'Enhanced intent classification with contextual awareness',
    category: 'intent_discovery',
    template: `Eres un clasificador experto de intenciones para consultas de base de datos del sistema MPD.

CONTEXTO DEL SISTEMA:
- Sistema de gestión de concursos públicos del Ministerio Público de la Defensa
- Usuarios: {{userRole}} (postulantes, administradores, evaluadores)
- Contexto temporal: {{temporalContext}}
- Historial de sesión: {{sessionHistory}}

ESQUEMA DE BASE DE DATOS:
{{dbSchema}}

CONSULTA DEL USUARIO:
{{userQuery}}

ANÁLISIS REQUERIDO:
1. Identifica la intención principal y secundarias
2. Evalúa la complejidad técnica y de negocio
3. Determina las tablas y relaciones necesarias
4. Estima el tipo de respuesta esperada
5. Considera factores contextuales específicos

Proporciona un análisis detallado de la intención:`,
    parameters: [
      {
        name: 'userQuery',
        type: 'string',
        required: true,
        description: 'The user query to analyze',
        validation: { minLength: 3, maxLength: 1000 }
      },
      {
        name: 'dbSchema',
        type: 'string',
        required: true,
        description: 'Database schema information'
      },
      {
        name: 'userRole',
        type: 'string',
        required: false,
        description: 'Role of the user making the query',
        defaultValue: 'administrator',
        validation: { enum: ['postulante', 'administrator', 'evaluador', 'guest'] }
      },
      {
        name: 'temporalContext',
        type: 'string',
        required: false,
        description: 'Temporal context (e.g., during contest period)',
        defaultValue: 'normal_operation'
      },
      {
        name: 'sessionHistory',
        type: 'string',
        required: false,
        description: 'Previous queries in the session',
        defaultValue: ''
      }
    ],
    defaultConfig: {
      temperature: 0.1,
      maxTokens: 1200,
      timeout: 15000,
      retries: 2,
      cacheEnabled: true,
      cacheTTL: 300000 // 5 minutes
    },
    examples: [
      {
        name: 'Simple data retrieval',
        description: 'Basic user count query',
        input: {
          userQuery: '¿Cuántos usuarios están registrados?',
          dbSchema: '{"users": {"id": "int", "name": "varchar", "status": "enum"}}',
          userRole: 'administrator'
        },
        expectedOutput: {
          primaryIntent: 'data_retrieval',
          complexity: 'simple',
          confidence: 0.95,
          requiredTables: ['users']
        }
      }
    ],
    metadata: {
      version: '2.0.0',
      author: 'MPD AI Team',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date(),
      tags: ['intent', 'classification', 'mpd', 'enhanced'],
      performance: {
        avgExecutionTime: 1200,
        successRate: 0.94,
        qualityScore: 0.89
      }
    }
  },

  // SQL Generation Templates
  sql_optimizer_v2: {
    id: 'sql_optimizer_v2',
    name: 'Advanced SQL Optimizer',
    description: 'Generates highly optimized SQL with performance considerations',
    category: 'sql_generation',
    template: `Eres un experto en optimización de consultas SQL para MySQL 8.0 especializado en el sistema MPD.

ANÁLISIS DE INTENCIÓN:
{{intentAnalysis}}

ESQUEMA DE BASE DE DATOS:
{{dbSchema}}

CONSULTA ORIGINAL:
{{userQuery}}

RESTRICCIONES DE RENDIMIENTO:
{{performanceConstraints}}

CONFIGURACIÓN DE OPTIMIZACIÓN:
- Prioridad: {{optimizationPriority}} (speed/memory/accuracy)
- Límite de tiempo: {{timeLimit}}ms
- Tamaño máximo de resultado: {{maxResultSize}} filas
- Índices disponibles: {{availableIndexes}}

INSTRUCCIONES ESPECÍFICAS:
1. Genera SQL optimizado considerando cardinalidad de tablas
2. Utiliza índices de manera eficiente
3. Minimiza operaciones costosas (subconsultas correlacionadas, funciones en WHERE)
4. Implementa paginación cuando sea necesario
5. Considera el contexto específico del dominio MPD
6. Proporciona explicación detallada de optimizaciones aplicadas

Genera consulta SQL optimizada:`,
    parameters: [
      {
        name: 'intentAnalysis',
        type: 'string',
        required: true,
        description: 'Intent analysis result from previous step'
      },
      {
        name: 'dbSchema',
        type: 'string',
        required: true,
        description: 'Database schema with index information'
      },
      {
        name: 'userQuery',
        type: 'string',
        required: true,
        description: 'Original user query'
      },
      {
        name: 'performanceConstraints',
        type: 'string',
        required: false,
        description: 'Performance constraints and requirements',
        defaultValue: 'Standard performance requirements'
      },
      {
        name: 'optimizationPriority',
        type: 'string',
        required: false,
        description: 'Optimization priority',
        defaultValue: 'speed',
        validation: { enum: ['speed', 'memory', 'accuracy', 'balanced'] }
      },
      {
        name: 'timeLimit',
        type: 'number',
        required: false,
        description: 'Maximum execution time in milliseconds',
        defaultValue: 5000
      },
      {
        name: 'maxResultSize',
        type: 'number',
        required: false,
        description: 'Maximum number of result rows',
        defaultValue: 1000
      },
      {
        name: 'availableIndexes',
        type: 'string',
        required: false,
        description: 'Available database indexes',
        defaultValue: 'Standard indexes on primary and foreign keys'
      }
    ],
    defaultConfig: {
      temperature: 0.05,
      maxTokens: 2000,
      timeout: 20000,
      retries: 3,
      cacheEnabled: true,
      cacheTTL: 600000 // 10 minutes
    },
    metadata: {
      version: '2.0.0',
      author: 'MPD AI Team',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date(),
      tags: ['sql', 'optimization', 'mysql', 'performance'],
      performance: {
        avgExecutionTime: 1800,
        successRate: 0.91,
        qualityScore: 0.87
      }
    }
  },

  // Context Analysis Templates
  context_analyzer_v2: {
    id: 'context_analyzer_v2',
    name: 'Advanced Context Analyzer',
    description: 'Deep context analysis with business intelligence',
    category: 'context_analysis',
    template: `Eres un analista experto en sistemas de concursos públicos del MPD con capacidades de inteligencia empresarial.

CONSULTA ORIGINAL:
{{originalQuery}}

ANÁLISIS DE INTENCIÓN:
{{intentAnalysis}}

RESULTADOS DE LA CONSULTA:
{{queryResults}}

CONTEXTO EMPRESARIAL:
{{businessContext}}

MÉTRICAS DE CALIDAD DE DATOS:
{{dataQualityMetrics}}

ANÁLISIS REQUERIDO:
1. INSIGHTS EMPRESARIALES:
   - Identifica patrones significativos en los datos
   - Detecta anomalías o tendencias importantes
   - Evalúa implicaciones para la gestión de concursos
   - Considera impacto en stakeholders (postulantes, administradores)

2. CALIDAD DE DATOS:
   - Evalúa completitud, consistencia y precisión
   - Identifica datos faltantes o inconsistentes
   - Sugiere mejoras en la calidad de datos

3. RECOMENDACIONES ACCIONABLES:
   - Proporciona recomendaciones específicas basadas en los datos
   - Sugiere acciones de seguimiento
   - Identifica oportunidades de mejora

4. SÍNTESIS CONTEXTUALIZADA:
   - Crea una respuesta comprensible para el usuario
   - Utiliza terminología apropiada para el dominio MPD
   - Estructura la información de manera lógica

Proporciona análisis contextual completo:`,
    parameters: [
      {
        name: 'originalQuery',
        type: 'string',
        required: true,
        description: 'Original user query'
      },
      {
        name: 'queryResults',
        type: 'string',
        required: true,
        description: 'Results from executed queries'
      },
      {
        name: 'intentAnalysis',
        type: 'string',
        required: true,
        description: 'Intent analysis from previous step'
      },
      {
        name: 'businessContext',
        type: 'string',
        required: false,
        description: 'Additional business context',
        defaultValue: 'Sistema de concursos públicos del Ministerio Público de la Defensa'
      },
      {
        name: 'dataQualityMetrics',
        type: 'string',
        required: false,
        description: 'Data quality metrics if available',
        defaultValue: 'No specific quality metrics provided'
      }
    ],
    defaultConfig: {
      temperature: 0.3,
      maxTokens: 2500,
      timeout: 25000,
      retries: 2,
      cacheEnabled: false, // Context analysis should be fresh
      cacheTTL: 0
    },
    metadata: {
      version: '2.0.0',
      author: 'MPD AI Team',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date(),
      tags: ['context', 'analysis', 'business-intelligence', 'mpd'],
      performance: {
        avgExecutionTime: 2200,
        successRate: 0.88,
        qualityScore: 0.92
      }
    }
  }
};

// ============================================================================
// PROMPT CONFIGURATION MANAGER
// ============================================================================

export class PromptConfigManager {
  private templates: Map<string, PromptTemplate> = new Map();
  private activeConfigs: Map<string, PromptExecutionConfig> = new Map();

  constructor() {
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates(): void {
    Object.entries(PROMPT_TEMPLATES).forEach(([key, template]) => {
      this.templates.set(key, template);
      this.activeConfigs.set(key, template.defaultConfig);
    });
  }

  /**
   * Get a prompt template by ID
   */
  getTemplate(templateId: string): PromptTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: PromptCategory): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  /**
   * Get execution configuration for a template
   */
  getExecutionConfig(templateId: string): PromptExecutionConfig | undefined {
    return this.activeConfigs.get(templateId);
  }

  /**
   * Update execution configuration for a template
   */
  updateExecutionConfig(templateId: string, config: Partial<PromptExecutionConfig>): void {
    const currentConfig = this.activeConfigs.get(templateId);
    if (currentConfig) {
      this.activeConfigs.set(templateId, { ...currentConfig, ...config });
    }
  }

  /**
   * Register a new template
   */
  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
    this.activeConfigs.set(template.id, template.defaultConfig);
  }

  /**
   * Get all available template IDs
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Validate template parameters
   */
  validateParameters(templateId: string, parameters: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const template = this.templates.get(templateId);
    if (!template) {
      return { valid: false, errors: [`Template '${templateId}' not found`] };
    }

    const errors: string[] = [];

    // Check required parameters
    template.parameters.forEach(param => {
      if (param.required && !(param.name in parameters)) {
        errors.push(`Required parameter '${param.name}' is missing`);
      }

      const value = parameters[param.name];
      if (value !== undefined && param.validation) {
        // Validate string parameters
        if (param.type === 'string' && typeof value === 'string') {
          if (param.validation.minLength && value.length < param.validation.minLength) {
            errors.push(`Parameter '${param.name}' is too short (min: ${param.validation.minLength})`);
          }
          if (param.validation.maxLength && value.length > param.validation.maxLength) {
            errors.push(`Parameter '${param.name}' is too long (max: ${param.validation.maxLength})`);
          }
          if (param.validation.enum && !param.validation.enum.includes(value)) {
            errors.push(`Parameter '${param.name}' must be one of: ${param.validation.enum.join(', ')}`);
          }
        }
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Build prompt from template with parameters
   */
  buildPrompt(templateId: string, parameters: Record<string, any>): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    // Validate parameters
    const validation = this.validateParameters(templateId, parameters);
    if (!validation.valid) {
      throw new Error(`Parameter validation failed: ${validation.errors.join(', ')}`);
    }

    // Fill in default values for missing optional parameters
    const filledParameters = { ...parameters };
    template.parameters.forEach(param => {
      if (!param.required && !(param.name in filledParameters) && param.defaultValue !== undefined) {
        filledParameters[param.name] = param.defaultValue;
      }
    });

    // Replace template variables
    let prompt = template.template;
    Object.entries(filledParameters).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value));
    });

    return prompt;
  }

  /**
   * Update template performance metrics
   */
  updatePerformanceMetrics(
    templateId: string, 
    executionTime: number, 
    success: boolean, 
    qualityScore?: number
  ): void {
    const template = this.templates.get(templateId);
    if (!template) return;

    const perf = template.metadata.performance;
    
    // Update average execution time
    if (perf.avgExecutionTime) {
      perf.avgExecutionTime = (perf.avgExecutionTime + executionTime) / 2;
    } else {
      perf.avgExecutionTime = executionTime;
    }

    // Update success rate (simple moving average)
    if (perf.successRate) {
      perf.successRate = (perf.successRate * 0.9) + (success ? 0.1 : 0);
    } else {
      perf.successRate = success ? 1 : 0;
    }

    // Update quality score if provided
    if (qualityScore !== undefined) {
      if (perf.qualityScore) {
        perf.qualityScore = (perf.qualityScore * 0.8) + (qualityScore * 0.2);
      } else {
        perf.qualityScore = qualityScore;
      }
    }

    template.metadata.updatedAt = new Date();
  }

  /**
   * Get performance statistics for all templates
   */
  getPerformanceStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    this.templates.forEach((template, id) => {
      stats[id] = {
        name: template.name,
        category: template.category,
        version: template.metadata.version,
        performance: template.metadata.performance,
        lastUpdated: template.metadata.updatedAt
      };
    });

    return stats;
  }
}

// Export singleton instance
export const promptConfigManager = new PromptConfigManager();