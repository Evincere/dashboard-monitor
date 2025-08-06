// src/ai/prompts/prompt-manager.ts

/**
 * @fileOverview Prompt Manager for specialized prompting system
 * Manages different types of prompts and their configurations for optimal performance
 */

import { z } from 'zod';
import { ai } from '@/ai/unified';
import { SupportedProvider } from '@/ai/providers/types';

// ============================================================================
// PROMPT CONFIGURATION TYPES
// ============================================================================

export interface PromptConfig {
  name: string;
  description: string;
  category: PromptCategory;
  provider?: SupportedProvider;
  temperature: number;
  maxTokens?: number;
  systemPrompt?: string;
  examples?: PromptExample[];
  validationSchema?: z.ZodSchema<any>;
}

export type PromptCategory = 
  | 'intent_discovery'
  | 'sql_generation' 
  | 'context_analysis'
  | 'iterative_resolution'
  | 'quality_assessment'
  | 'error_handling';

export interface PromptExample {
  input: Record<string, any>;
  expectedOutput: Record<string, any>;
  description: string;
}

// ============================================================================
// SPECIALIZED PROMPT TEMPLATES
// ============================================================================

export const SPECIALIZED_PROMPTS: Record<string, PromptConfig> = {
  // Intent Discovery Prompts
  intent_classifier: {
    name: 'intent_classifier',
    description: 'Classifies user intent for database queries',
    category: 'intent_discovery',
    temperature: 0.1,
    maxTokens: 1000,
    systemPrompt: `Eres un clasificador experto de intenciones para consultas de base de datos del sistema MPD.
Tu tarea es analizar consultas de usuarios y clasificar su intención principal con alta precisión.
Considera el contexto específico de concursos públicos y gestión administrativa.`,
    examples: [
      {
        input: { query: "¿Cuántos usuarios están registrados?" },
        expectedOutput: { intent: "data_retrieval", complexity: "simple", confidence: 0.95 },
        description: "Simple data retrieval query"
      },
      {
        input: { query: "Analiza las tendencias de inscripciones en los últimos 6 meses" },
        expectedOutput: { intent: "trend_analysis", complexity: "complex", confidence: 0.90 },
        description: "Complex trend analysis request"
      }
    ]
  },

  intent_context_analyzer: {
    name: 'intent_context_analyzer',
    description: 'Analyzes contextual factors affecting query intent',
    category: 'intent_discovery',
    temperature: 0.2,
    maxTokens: 800,
    systemPrompt: `Analiza factores contextuales que afectan la interpretación de consultas.
Considera el historial de conversación, el rol del usuario, y el contexto temporal.`
  },

  // SQL Generation Prompts
  sql_optimizer: {
    name: 'sql_optimizer',
    description: 'Generates optimized SQL queries for MySQL 8.0',
    category: 'sql_generation',
    temperature: 0.05,
    maxTokens: 1500,
    systemPrompt: `Eres un experto en optimización de consultas SQL para MySQL 8.0.
Genera consultas eficientes considerando índices, cardinalidad y mejores prácticas.
Prioriza la legibilidad y el rendimiento.`,
    examples: [
      {
        input: { 
          intent: "data_retrieval", 
          tables: ["users"], 
          query: "usuarios activos" 
        },
        expectedOutput: { 
          sql: "SELECT id, name, email FROM users WHERE status = 'ACTIVE' ORDER BY created_at DESC",
          explanation: "Simple query with index on status column"
        },
        description: "Basic user retrieval with optimization"
      }
    ]
  },

  sql_validator: {
    name: 'sql_validator',
    description: 'Validates and suggests improvements for SQL queries',
    category: 'sql_generation',
    temperature: 0.1,
    maxTokens: 1000,
    systemPrompt: `Valida consultas SQL y sugiere mejoras de rendimiento y seguridad.
Identifica posibles problemas como SQL injection, consultas lentas, o uso ineficiente de índices.`
  },

  // Context Analysis Prompts
  data_interpreter: {
    name: 'data_interpreter',
    description: 'Interprets query results in business context',
    category: 'context_analysis',
    temperature: 0.3,
    maxTokens: 2000,
    systemPrompt: `Interpreta resultados de consultas en el contexto del sistema de concursos MPD.
Proporciona insights empresariales, identifica patrones y sugiere acciones.
Considera implicaciones para la gestión administrativa y toma de decisiones.`
  },

  quality_assessor: {
    name: 'quality_assessor',
    description: 'Assesses data quality and reliability',
    category: 'quality_assessment',
    temperature: 0.2,
    maxTokens: 800,
    systemPrompt: `Evalúa la calidad y confiabilidad de los datos obtenidos.
Identifica inconsistencias, datos faltantes, y posibles problemas de integridad.
Proporciona métricas de calidad y recomendaciones de mejora.`
  },

  // Iterative Resolution Prompts
  task_planner: {
    name: 'task_planner',
    description: 'Plans multi-step query resolution strategies',
    category: 'iterative_resolution',
    temperature: 0.15,
    maxTokens: 1500,
    systemPrompt: `Planifica estrategias de resolución multi-paso para consultas complejas.
Descompón problemas complejos en tareas manejables con dependencias claras.
Optimiza el orden de ejecución para eficiencia máxima.`
  },

  progress_monitor: {
    name: 'progress_monitor',
    description: 'Monitors and adjusts iterative resolution progress',
    category: 'iterative_resolution',
    temperature: 0.2,
    maxTokens: 1000,
    systemPrompt: `Monitorea el progreso de resolución iterativa y ajusta la estrategia según sea necesario.
Identifica cuándo cambiar de enfoque o cuándo la resolución está completa.`
  },

  // Error Handling Prompts
  error_analyzer: {
    name: 'error_analyzer',
    description: 'Analyzes and provides solutions for query errors',
    category: 'error_handling',
    temperature: 0.1,
    maxTokens: 800,
    systemPrompt: `Analiza errores en consultas SQL y proporciona soluciones específicas.
Identifica la causa raíz del error y sugiere correcciones precisas.
Considera errores de sintaxis, permisos, y problemas de datos.`
  },

  fallback_handler: {
    name: 'fallback_handler',
    description: 'Handles cases where primary prompts fail',
    category: 'error_handling',
    temperature: 0.4,
    maxTokens: 600,
    systemPrompt: `Maneja casos donde los prompts principales fallan.
Proporciona respuestas útiles y sugiere enfoques alternativos.
Mantén la experiencia del usuario positiva incluso en casos de error.`
  }
};

// ============================================================================
// PROMPT MANAGER CLASS
// ============================================================================

export class PromptManager {
  private prompts: Map<string, PromptConfig> = new Map();
  private promptCache: Map<string, any> = new Map();
  private usageStats: Map<string, { count: number; avgTime: number; successRate: number }> = new Map();

  constructor() {
    this.initializePrompts();
  }

  private initializePrompts(): void {
    Object.entries(SPECIALIZED_PROMPTS).forEach(([key, config]) => {
      this.prompts.set(key, config);
      this.usageStats.set(key, { count: 0, avgTime: 0, successRate: 1.0 });
    });
  }

  /**
   * Execute a specialized prompt with automatic provider selection and error handling
   */
  async executePrompt<TInput, TOutput>(
    promptName: string,
    input: TInput,
    outputSchema: z.ZodSchema<TOutput>,
    options?: {
      provider?: SupportedProvider;
      useCache?: boolean;
      timeout?: number;
    }
  ): Promise<{
    output: TOutput;
    metadata: {
      promptName: string;
      provider: string;
      executionTime: number;
      fromCache: boolean;
    };
  }> {
    const startTime = Date.now();
    const promptConfig = this.prompts.get(promptName);
    
    if (!promptConfig) {
      throw new Error(`Prompt '${promptName}' not found`);
    }

    // Check cache if enabled
    const cacheKey = this.generateCacheKey(promptName, input);
    if (options?.useCache && this.promptCache.has(cacheKey)) {
      const cachedResult = this.promptCache.get(cacheKey);
      return {
        output: cachedResult,
        metadata: {
          promptName,
          provider: 'cache',
          executionTime: Date.now() - startTime,
          fromCache: true
        }
      };
    }

    try {
      // Build the complete prompt
      const fullPrompt = this.buildPrompt(promptConfig, input);
      
      // Select provider
      const provider = options?.provider || promptConfig.provider;
      
      // Execute with timeout
      const timeoutMs = options?.timeout || 30000;
      const result = await Promise.race([
        ai.generateWithSchema(fullPrompt, outputSchema, {
          provider,
          temperature: promptConfig.temperature,
          maxTokens: promptConfig.maxTokens
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Prompt execution timeout')), timeoutMs)
        )
      ]);

      const executionTime = Date.now() - startTime;

      // Update usage statistics
      this.updateUsageStats(promptName, executionTime, true);

      // Cache result if enabled
      if (options?.useCache) {
        this.promptCache.set(cacheKey, result);
      }

      return {
        output: result,
        metadata: {
          promptName,
          provider: provider || 'default',
          executionTime,
          fromCache: false
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateUsageStats(promptName, executionTime, false);
      
      console.error(`Error executing prompt '${promptName}':`, error);
      throw new Error(`Error en prompt '${promptName}': ${error}`);
    }
  }

  /**
   * Get the best provider for a specific prompt based on performance history
   */
  getBestProvider(promptName: string): SupportedProvider | undefined {
    const promptConfig = this.prompts.get(promptName);
    if (!promptConfig) return undefined;

    // For now, return the configured provider or let the system choose
    // In the future, this could use performance metrics to select the best provider
    return promptConfig.provider;
  }

  /**
   * Get prompt configuration
   */
  getPromptConfig(promptName: string): PromptConfig | undefined {
    return this.prompts.get(promptName);
  }

  /**
   * Get prompts by category
   */
  getPromptsByCategory(category: PromptCategory): PromptConfig[] {
    return Array.from(this.prompts.values()).filter(p => p.category === category);
  }

  /**
   * Get usage statistics for monitoring and optimization
   */
  getUsageStats(): Record<string, { count: number; avgTime: number; successRate: number }> {
    return Object.fromEntries(this.usageStats.entries());
  }

  /**
   * Clear prompt cache
   */
  clearCache(): void {
    this.promptCache.clear();
  }

  /**
   * Add or update a prompt configuration
   */
  registerPrompt(name: string, config: PromptConfig): void {
    this.prompts.set(name, config);
    if (!this.usageStats.has(name)) {
      this.usageStats.set(name, { count: 0, avgTime: 0, successRate: 1.0 });
    }
  }

  private buildPrompt(config: PromptConfig, input: any): string {
    let prompt = config.systemPrompt || '';
    
    // Add examples if available
    if (config.examples && config.examples.length > 0) {
      prompt += '\n\nEJEMPLOS:\n';
      config.examples.forEach((example, index) => {
        prompt += `\nEjemplo ${index + 1}:\n`;
        prompt += `Entrada: ${JSON.stringify(example.input)}\n`;
        prompt += `Salida esperada: ${JSON.stringify(example.expectedOutput)}\n`;
        prompt += `Descripción: ${example.description}\n`;
      });
    }

    // Add current input
    prompt += '\n\nENTRADA ACTUAL:\n';
    if (typeof input === 'string') {
      prompt += input;
    } else {
      prompt += JSON.stringify(input, null, 2);
    }

    return prompt;
  }

  private generateCacheKey(promptName: string, input: any): string {
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
    return `${promptName}:${Buffer.from(inputStr).toString('base64').slice(0, 32)}`;
  }

  private updateUsageStats(promptName: string, executionTime: number, success: boolean): void {
    const stats = this.usageStats.get(promptName);
    if (!stats) return;

    stats.count++;
    stats.avgTime = (stats.avgTime * (stats.count - 1) + executionTime) / stats.count;
    stats.successRate = (stats.successRate * (stats.count - 1) + (success ? 1 : 0)) / stats.count;
    
    this.usageStats.set(promptName, stats);
  }
}

// Export singleton instance
export const promptManager = new PromptManager();