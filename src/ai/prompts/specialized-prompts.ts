// src/ai/prompts/specialized-prompts.ts

/**
 * @fileOverview Specialized prompting system for the dashboard-monitor
 * Provides specialized prompts for intent discovery, SQL generation, context analysis, and iterative query resolution
 */

import { z } from 'zod';
import { ai } from '@/ai/unified';

// ============================================================================
// INTENT DISCOVERY PROMPTS
// ============================================================================

export const IntentDiscoverySchema = z.object({
  primaryIntent: z.enum([
    'data_retrieval',      // Simple data fetching
    'analysis_request',    // Data analysis and insights
    'comparison_query',    // Comparing different data sets
    'trend_analysis',      // Time-based patterns
    'administrative',      // User/system management
    'reporting',          // Generate reports
    'exploration',        // Open-ended data exploration
    'troubleshooting'     // System diagnostics
  ]).describe('The primary intent category of the user query'),
  
  complexity: z.enum(['simple', 'moderate', 'complex']).describe('Query complexity level'),
  
  confidence: z.number().min(0).max(1).describe('Confidence score for intent classification'),
  
  requiredTables: z.array(z.string()).describe('Database tables likely needed for this query'),
  
  queryType: z.enum([
    'single_table',       // Query involves one table
    'join_required',      // Multiple tables need to be joined
    'aggregation',        // Requires GROUP BY, COUNT, SUM, etc.
    'temporal',           // Time-based queries
    'hierarchical',       // Parent-child relationships
    'full_text_search'    // Text search operations
  ]).describe('Type of SQL query structure needed'),
  
  expectedOutputFormat: z.enum([
    'tabular_data',       // Raw table data
    'summary_statistics', // Aggregated numbers
    'narrative_response', // Human-readable explanation
    'visualization_data', // Data for charts/graphs
    'action_items'        // Recommendations or next steps
  ]).describe('Expected format of the response'),
  
  contextualFactors: z.array(z.string()).describe('Important contextual factors to consider'),
  
  reasoning: z.string().describe('Explanation of the intent classification decision')
});

export type IntentDiscoveryResult = z.infer<typeof IntentDiscoverySchema>;

export const intentDiscoveryPrompt = ai.definePrompt({
  name: 'intentDiscoveryPrompt',
  input: { 
    schema: z.object({ 
      userQuery: z.string(),
      dbSchema: z.string(),
      conversationHistory: z.string().optional()
    }) 
  },
  output: { schema: IntentDiscoverySchema },
  prompt: `Eres un experto analizador de intenciones para consultas de base de datos del sistema de concursos del Ministerio Público de la Defensa (MPD).

Tu tarea es analizar la consulta del usuario y determinar:
1. La intención principal detrás de la consulta
2. El nivel de complejidad requerido
3. Las tablas de base de datos que probablemente se necesiten
4. El tipo de estructura SQL requerida
5. El formato de salida esperado

CONTEXTO DEL SISTEMA:
- Sistema de gestión de concursos públicos
- Usuarios: postulantes, administradores, evaluadores
- Datos principales: usuarios, concursos, inscripciones, documentos, evaluaciones
- Funcionalidades: gestión de usuarios, administración de concursos, evaluación de postulantes

ESQUEMA DE BASE DE DATOS:
{{{dbSchema}}}

HISTORIAL DE CONVERSACIÓN (si existe):
{{{conversationHistory}}}

CONSULTA DEL USUARIO:
{{{userQuery}}}

INSTRUCCIONES ESPECÍFICAS:
- Analiza el contexto y la intención real detrás de la consulta
- Considera el dominio específico de concursos públicos
- Identifica si la consulta requiere datos históricos, comparaciones, o análisis temporal
- Determina si se necesita información agregada o datos detallados
- Evalúa si la consulta implica acciones administrativas o solo consulta de datos
- Considera factores como permisos, privacidad y sensibilidad de los datos

Proporciona un análisis detallado de la intención:`,
  config: { temperature: 0.2 }
});

// ============================================================================
// OPTIMIZED SQL GENERATION PROMPTS
// ============================================================================

export const OptimizedSQLSchema = z.object({
  sqlQuery: z.string().describe('The optimized SQL query'),
  queryExplanation: z.string().describe('Explanation of the query logic'),
  optimizationTechniques: z.array(z.string()).describe('Optimization techniques applied'),
  estimatedComplexity: z.enum(['low', 'medium', 'high']).describe('Estimated query execution complexity'),
  indexSuggestions: z.array(z.string()).describe('Suggested indexes for better performance'),
  potentialIssues: z.array(z.string()).describe('Potential issues or limitations'),
  alternativeApproaches: z.array(z.string()).describe('Alternative query approaches if applicable')
});

export type OptimizedSQLResult = z.infer<typeof OptimizedSQLSchema>;

export const optimizedSQLGenerationPrompt = ai.definePrompt({
  name: 'optimizedSQLGenerationPrompt',
  input: { 
    schema: z.object({ 
      intentAnalysis: z.string(),
      dbSchema: z.string(),
      userQuery: z.string(),
      performanceConstraints: z.string().optional()
    }) 
  },
  output: { schema: OptimizedSQLSchema },
  prompt: `Eres un experto en optimización de consultas SQL para MySQL 8.0, especializado en sistemas de gestión de concursos públicos.

ANÁLISIS DE INTENCIÓN:
{{{intentAnalysis}}}

ESQUEMA DE BASE DE DATOS:
{{{dbSchema}}}

CONSULTA ORIGINAL DEL USUARIO:
{{{userQuery}}}

RESTRICCIONES DE RENDIMIENTO (si existen):
{{{performanceConstraints}}}

INSTRUCCIONES PARA GENERACIÓN SQL OPTIMIZADA:

1. OPTIMIZACIÓN DE RENDIMIENTO:
   - Utiliza índices existentes de manera eficiente
   - Minimiza el uso de subconsultas cuando sea posible
   - Prefiere JOINs sobre subconsultas correlacionadas
   - Utiliza LIMIT cuando sea apropiado
   - Considera el uso de índices compuestos

2. MEJORES PRÁCTICAS:
   - Utiliza nombres de columna específicos en lugar de SELECT *
   - Aplica filtros WHERE lo más temprano posible
   - Utiliza EXPLAIN para validar el plan de ejecución
   - Considera la cardinalidad de las tablas

3. CONTEXTO DEL DOMINIO:
   - Considera la naturaleza temporal de los concursos
   - Ten en cuenta las relaciones jerárquicas (usuarios -> inscripciones -> documentos)
   - Respeta las restricciones de privacidad y seguridad
   - Optimiza para casos de uso comunes del sistema MPD

4. MANEJO DE DATOS:
   - Utiliza agregaciones eficientes para reportes
   - Considera el impacto de datos históricos grandes
   - Implementa paginación para resultados grandes
   - Maneja correctamente valores NULL y datos faltantes

Genera una consulta SQL optimizada con explicación detallada:`,
  config: { temperature: 0.1 }
});

// ============================================================================
// CONTEXT ANALYSIS AND SYNTHESIS PROMPTS
// ============================================================================

export const ContextAnalysisSchema = z.object({
  keyInsights: z.array(z.string()).describe('Key insights extracted from the data'),
  dataQuality: z.object({
    completeness: z.number().min(0).max(1).describe('Data completeness score'),
    reliability: z.number().min(0).max(1).describe('Data reliability score'),
    issues: z.array(z.string()).describe('Data quality issues identified')
  }).describe('Assessment of data quality'),
  businessContext: z.array(z.string()).describe('Business context and implications'),
  recommendations: z.array(z.string()).describe('Actionable recommendations based on the data'),
  followUpQuestions: z.array(z.string()).describe('Suggested follow-up questions'),
  synthesizedResponse: z.string().describe('Human-readable synthesized response')
});

export type ContextAnalysisResult = z.infer<typeof ContextAnalysisSchema>;

export const contextAnalysisPrompt = ai.definePrompt({
  name: 'contextAnalysisPrompt',
  input: { 
    schema: z.object({ 
      originalQuery: z.string(),
      queryResults: z.string(),
      intentAnalysis: z.string(),
      businessContext: z.string().optional()
    }) 
  },
  output: { schema: ContextAnalysisSchema },
  prompt: `Eres un analista experto en sistemas de concursos públicos del Ministerio Público de la Defensa (MPD).

Tu tarea es analizar los resultados de consultas de base de datos y proporcionar insights contextualizados, considerando:
- El contexto específico del sistema de concursos públicos
- Las implicaciones para la gestión administrativa
- La calidad y confiabilidad de los datos
- Recomendaciones prácticas para la toma de decisiones

CONSULTA ORIGINAL DEL USUARIO:
{{{originalQuery}}}

ANÁLISIS DE INTENCIÓN:
{{{intentAnalysis}}}

RESULTADOS DE LA CONSULTA (formato JSON):
{{{queryResults}}}

CONTEXTO EMPRESARIAL ADICIONAL (si existe):
{{{businessContext}}}

INSTRUCCIONES PARA EL ANÁLISIS CONTEXTUAL:

1. ANÁLISIS DE DATOS:
   - Identifica patrones, tendencias y anomalías en los datos
   - Evalúa la completitud y calidad de la información
   - Detecta posibles inconsistencias o datos faltantes
   - Considera el contexto temporal de los datos

2. CONTEXTO DEL DOMINIO MPD:
   - Interpreta los datos en el contexto de concursos públicos
   - Considera las implicaciones para postulantes y administradores
   - Evalúa el impacto en procesos de selección y evaluación
   - Ten en cuenta aspectos de transparencia y equidad

3. INSIGHTS EMPRESARIALES:
   - Identifica oportunidades de mejora en procesos
   - Detecta posibles problemas operacionales
   - Sugiere optimizaciones basadas en los datos
   - Considera implicaciones de recursos y presupuesto

4. SÍNTESIS DE RESPUESTA:
   - Proporciona una respuesta clara y comprensible
   - Utiliza un lenguaje apropiado para administradores públicos
   - Incluye datos específicos y métricas relevantes
   - Estructura la información de manera lógica y accionable

Proporciona un análisis contextual completo y una síntesis clara:`,
  config: { temperature: 0.3 }
});

// ============================================================================
// ITERATIVE QUERY RESOLUTION SYSTEM
// ============================================================================

export const IterativeResolutionSchema = z.object({
  resolutionPlan: z.object({
    totalSteps: z.number().describe('Total number of steps in the resolution plan'),
    currentStep: z.number().describe('Current step being executed'),
    steps: z.array(z.object({
      stepId: z.string().describe('Unique identifier for the step'),
      description: z.string().describe('Description of what this step accomplishes'),
      queryType: z.enum(['data_collection', 'analysis', 'validation', 'synthesis']).describe('Type of operation'),
      dependencies: z.array(z.string()).describe('Step IDs this step depends on'),
      sqlQuery: z.string().optional().describe('SQL query for this step if applicable'),
      expectedOutput: z.string().describe('Expected output format and content')
    }))
  }).describe('Detailed resolution plan'),
  
  nextAction: z.enum([
    'execute_query',      // Execute the next SQL query
    'analyze_results',    // Analyze current results
    'synthesize_response', // Create final response
    'request_clarification', // Need user clarification
    'complete'            // Resolution complete
  ]).describe('Next action to take'),
  
  progressSummary: z.string().describe('Summary of progress made so far'),
  
  intermediateResults: z.record(z.any()).describe('Results from completed steps'),
  
  qualityMetrics: z.object({
    completeness: z.number().min(0).max(1).describe('How complete is the current resolution'),
    confidence: z.number().min(0).max(1).describe('Confidence in the current approach'),
    efficiency: z.number().min(0).max(1).describe('Efficiency of the resolution process')
  }).describe('Quality metrics for the resolution process')
});

export type IterativeResolutionResult = z.infer<typeof IterativeResolutionSchema>;

export const iterativeResolutionPrompt = ai.definePrompt({
  name: 'iterativeResolutionPrompt',
  input: { 
    schema: z.object({ 
      originalQuery: z.string(),
      intentAnalysis: z.string(),
      currentState: z.string(),
      previousResults: z.string().optional(),
      iterationCount: z.number()
    }) 
  },
  output: { schema: IterativeResolutionSchema },
  prompt: `Eres un coordinador experto en resolución iterativa de consultas complejas para el sistema MPD.

Tu tarea es gestionar el proceso de resolución paso a paso, asegurando que cada iteración acerque más a la respuesta final completa y precisa.

CONSULTA ORIGINAL:
{{{originalQuery}}}

ANÁLISIS DE INTENCIÓN:
{{{intentAnalysis}}}

ESTADO ACTUAL DEL PROCESO:
{{{currentState}}}

RESULTADOS PREVIOS (si existen):
{{{previousResults}}}

NÚMERO DE ITERACIÓN ACTUAL:
{{{iterationCount}}}

INSTRUCCIONES PARA RESOLUCIÓN ITERATIVA:

1. PLANIFICACIÓN ESTRATÉGICA:
   - Descompón consultas complejas en pasos manejables
   - Identifica dependencias entre pasos
   - Prioriza pasos críticos para la resolución
   - Considera la eficiencia del proceso general

2. GESTIÓN DE ESTADO:
   - Mantén seguimiento del progreso actual
   - Identifica qué información ya se ha recopilado
   - Determina qué pasos quedan por completar
   - Evalúa la calidad de los resultados intermedios

3. CONTROL DE CALIDAD:
   - Valida la consistencia de los datos entre pasos
   - Verifica que cada paso contribuya al objetivo final
   - Identifica cuándo se necesita información adicional
   - Determina cuándo la resolución está completa

4. OPTIMIZACIÓN DEL PROCESO:
   - Evita pasos redundantes o innecesarios
   - Combina pasos cuando sea eficiente
   - Paraleliza operaciones independientes cuando sea posible
   - Minimiza el número total de iteraciones

5. CRITERIOS DE FINALIZACIÓN:
   - La consulta original ha sido completamente respondida
   - Todos los aspectos importantes han sido cubiertos
   - La calidad de la respuesta es satisfactoria
   - No se requieren pasos adicionales

Proporciona un plan de resolución iterativa detallado:`,
  config: { temperature: 0.2 }
});

// ============================================================================
// SPECIALIZED PROMPT ORCHESTRATOR
// ============================================================================

export class SpecializedPromptOrchestrator {
  /**
   * Execute the complete specialized prompting workflow
   */
  async executeSpecializedWorkflow(
    userQuery: string,
    dbSchema: string,
    conversationHistory?: string
  ): Promise<{
    intentAnalysis: IntentDiscoveryResult;
    sqlGeneration?: OptimizedSQLResult;
    contextAnalysis?: ContextAnalysisResult;
    iterativeResolution?: IterativeResolutionResult;
    finalResponse: string;
    processingMetrics: {
      totalTime: number;
      stepsCompleted: number;
      qualityScore: number;
    };
  }> {
    const startTime = Date.now();
    let stepsCompleted = 0;

    try {
      // Step 1: Intent Discovery
      const { output: intentAnalysis } = await intentDiscoveryPrompt({
        userQuery,
        dbSchema,
        conversationHistory: conversationHistory || ''
      });
      stepsCompleted++;

      // Step 2: Determine if SQL generation is needed
      let sqlGeneration: OptimizedSQLResult | undefined;
      if (this.requiresSQLGeneration(intentAnalysis)) {
        const { output } = await optimizedSQLGenerationPrompt({
          intentAnalysis: JSON.stringify(intentAnalysis),
          dbSchema,
          userQuery,
          performanceConstraints: ''
        });
        sqlGeneration = output;
        stepsCompleted++;
      }

      // Step 3: Context Analysis (if we have results)
      let contextAnalysis: ContextAnalysisResult | undefined;
      
      // Step 4: Iterative Resolution for complex queries
      let iterativeResolution: IterativeResolutionResult | undefined;
      if (intentAnalysis.complexity === 'complex') {
        const { output } = await iterativeResolutionPrompt({
          originalQuery: userQuery,
          intentAnalysis: JSON.stringify(intentAnalysis),
          currentState: 'initial',
          iterationCount: 1
        });
        iterativeResolution = output;
        stepsCompleted++;
      }

      // Generate final response
      const finalResponse = this.synthesizeFinalResponse(
        userQuery,
        intentAnalysis,
        sqlGeneration,
        contextAnalysis,
        iterativeResolution
      );

      const totalTime = Date.now() - startTime;
      const qualityScore = this.calculateQualityScore(
        intentAnalysis,
        sqlGeneration,
        contextAnalysis
      );

      return {
        intentAnalysis,
        sqlGeneration,
        contextAnalysis,
        iterativeResolution,
        finalResponse,
        processingMetrics: {
          totalTime,
          stepsCompleted,
          qualityScore
        }
      };

    } catch (error) {
      console.error('Error in specialized prompting workflow:', error);
      throw new Error(`Error en el sistema de prompting especializado: ${error}`);
    }
  }

  private requiresSQLGeneration(intentAnalysis: IntentDiscoveryResult): boolean {
    return [
      'data_retrieval',
      'analysis_request',
      'comparison_query',
      'trend_analysis',
      'reporting'
    ].includes(intentAnalysis.primaryIntent);
  }

  private synthesizeFinalResponse(
    userQuery: string,
    intentAnalysis: IntentDiscoveryResult,
    sqlGeneration?: OptimizedSQLResult,
    contextAnalysis?: ContextAnalysisResult,
    iterativeResolution?: IterativeResolutionResult
  ): string {
    let response = `Análisis de tu consulta: "${userQuery}"\n\n`;
    
    response += `**Intención detectada:** ${intentAnalysis.primaryIntent}\n`;
    response += `**Complejidad:** ${intentAnalysis.complexity}\n`;
    response += `**Confianza:** ${(intentAnalysis.confidence * 100).toFixed(1)}%\n\n`;

    if (sqlGeneration) {
      response += `**Consulta SQL generada:**\n\`\`\`sql\n${sqlGeneration.sqlQuery}\n\`\`\`\n\n`;
      response += `**Explicación:** ${sqlGeneration.queryExplanation}\n\n`;
    }

    if (contextAnalysis) {
      response += `**Insights principales:**\n`;
      contextAnalysis.keyInsights.forEach(insight => {
        response += `- ${insight}\n`;
      });
      response += `\n${contextAnalysis.synthesizedResponse}\n\n`;
    }

    if (iterativeResolution) {
      response += `**Plan de resolución:** ${iterativeResolution.resolutionPlan.totalSteps} pasos\n`;
      response += `**Progreso:** ${iterativeResolution.progressSummary}\n\n`;
    }

    return response;
  }

  private calculateQualityScore(
    intentAnalysis: IntentDiscoveryResult,
    sqlGeneration?: OptimizedSQLResult,
    contextAnalysis?: ContextAnalysisResult
  ): number {
    let score = intentAnalysis.confidence * 0.4; // 40% weight on intent confidence
    
    if (sqlGeneration) {
      const complexityScore = sqlGeneration.estimatedComplexity === 'low' ? 1 : 
                             sqlGeneration.estimatedComplexity === 'medium' ? 0.8 : 0.6;
      score += complexityScore * 0.3; // 30% weight on SQL quality
    }
    
    if (contextAnalysis) {
      score += (contextAnalysis.dataQuality.completeness + contextAnalysis.dataQuality.reliability) / 2 * 0.3; // 30% weight on context quality
    }
    
    return Math.min(score, 1.0);
  }
}

// Export singleton instance
export const specializedPromptOrchestrator = new SpecializedPromptOrchestrator();