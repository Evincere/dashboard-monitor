// src/ai/flows/intelligent-query-router.ts
'use server';

/**
 * @fileOverview Unified intelligent query system that automatically analyzes input 
 * and determines whether to use simple or complex query processing.
 * Enhanced with specialized prompting system for optimal performance.
 */

import { ai } from '@/ai/unified';
import { executeQuery, getDbSchema } from '@/services/database';
import { z } from 'genkit';
import { summarizeQueryResults } from './summarize-query-results';
import { 
  specializedPromptOrchestrator,
  intentDiscoveryPrompt,
  optimizedSQLGenerationPrompt,
  contextAnalysisPrompt
} from '@/ai/prompts/specialized-prompts';
import { promptManager } from '@/ai/prompts/prompt-manager';
import { iterativeQueryResolver } from './iterative-query-resolver';
import { getContextualLearningSystem } from '@/ai/embeddings/contextual-learning';
import { getResponseQualityMetrics } from '@/ai/embeddings/response-quality-metrics';
import { getEmbeddingService, getPersistentMemoryManager, getSemanticSearchService } from '@/ai/embeddings';

const IntelligentQueryInputSchema = z.object({
  question: z.string().describe('The user question in Spanish to be analyzed and processed.'),
});
export type IntelligentQueryInput = z.infer<typeof IntelligentQueryInputSchema>;

const IntelligentQueryOutputSchema = z.object({
  answer: z.string().describe('The final answer to the user question.'),
  queryType: z.enum(['simple', 'complex']).describe('The type of query processing used.'),
  sqlQueries: z.array(z.string()).describe('The SQL queries that were executed.'),
  processingTime: z.string().describe('Total processing time in milliseconds.'),
  queryQuality: z.string().describe('Quality assessment of the response.'),
});
export type IntelligentQueryOutput = z.infer<typeof IntelligentQueryOutputSchema>;

export async function intelligentQueryRouter(input: IntelligentQueryInput): Promise<IntelligentQueryOutput> {
  return intelligentQueryFlowEnhanced(input);
}

// Initialize contextual learning system
let contextualLearningInitialized = false;
async function initializeContextualLearning() {
  if (contextualLearningInitialized) return;
  
  try {
    const embeddingService = await getEmbeddingService();
    const memoryManager = await getPersistentMemoryManager();
    const searchService = await getSemanticSearchService();
    const contextualLearning = await getContextualLearningSystem();
    
    await contextualLearning.initialize(embeddingService, memoryManager, searchService);
    contextualLearningInitialized = true;
    console.log('🧠 Contextual learning system initialized for query router');
  } catch (error) {
    console.warn('⚠️ Failed to initialize contextual learning:', error);
  }
}

// Enhanced intelligent query flow using specialized prompting system
const intelligentQueryFlowEnhanced = ai.defineFlow(
  {
    name: 'intelligentQueryFlowEnhanced',
    inputSchema: IntelligentQueryInputSchema,
    outputSchema: IntelligentQueryOutputSchema,
  },
  async ({ question }) => {
    const startTime = Date.now();
    const dbSchema = await getDbSchema();
    const schemaString = JSON.stringify(dbSchema, null, 2);

    // Initialize contextual learning system
    await initializeContextualLearning();

    try {
      // Step 1: Check for similar queries in contextual learning cache
      const contextualLearning = await getContextualLearningSystem();
      const similarQueryCheck = await contextualLearning.checkForSimilarQuery(question);
      
      if (similarQueryCheck.shouldUseCache && similarQueryCheck.cacheEntry) {
        console.log('🎯 Using cached response from contextual learning');
        
        // Optionally improve the cached response
        const improvement = await contextualLearning.improveResponse(
          question,
          similarQueryCheck.cacheEntry.response,
          { userFeedback: 'neutral' }
        );

        const processingTime = Date.now() - startTime;
        const qualityMetrics = getResponseQualityMetrics();
        
        // Record quality metrics
        qualityMetrics.recordQuality(similarQueryCheck.cacheEntry.quality, {
          category: 'cached-response',
          queryId: similarQueryCheck.cacheEntry.id,
        });

        return {
          answer: improvement.improvedResponse,
          queryType: 'simple' as const,
          sqlQueries: similarQueryCheck.cacheEntry.metadata.sqlQueries,
          processingTime: `${processingTime}`,
          queryQuality: 'High (Cached + Improved)',
        };
      }

      // Step 2: Use specialized intent discovery
      const { output: intentAnalysis } = await intentDiscoveryPrompt({
        userQuery: question,
        dbSchema: schemaString,
        conversationHistory: ''
      });

      // Step 3: Route based on complexity and intent
      let result: IntelligentQueryOutput;
      if (intentAnalysis.complexity === 'simple') {
        result = await processSimpleQueryEnhanced(question, schemaString, intentAnalysis, startTime);
      } else if (intentAnalysis.complexity === 'moderate') {
        result = await processModerateQueryEnhanced(question, schemaString, intentAnalysis, startTime);
      } else {
        result = await processComplexQueryEnhanced(question, schemaString, intentAnalysis, startTime);
      }

      // Step 4: Store result in contextual learning system
      await contextualLearning.storeQueryResponse(question, result.answer, {
        processingTime: parseInt(result.processingTime),
        sqlQueries: result.sqlQueries,
        dataPoints: result.sqlQueries.length,
        category: intentAnalysis.complexity,
      });

      return result;

    } catch (error) {
      console.error('Error in enhanced intelligent query flow:', error);
      
      // Fallback to original implementation
      return await fallbackToOriginalFlow(question, schemaString, startTime);
    }
  }
);

// Keep original flow as fallback
const intelligentQueryFlow = ai.defineFlow(
  {
    name: 'intelligentQueryFlow',
    inputSchema: IntelligentQueryInputSchema,
    outputSchema: IntelligentQueryOutputSchema,
  },
  async ({ question }) => {
    const startTime = Date.now();
    const dbSchema = await getDbSchema();
    const schemaString = JSON.stringify(dbSchema, null, 2);

    // Step 1: Analyze query complexity and intent
    const complexityAnalyzer = ai.definePrompt({
      name: 'queryComplexityAnalyzer',
      input: { 
        schema: z.object({ 
          question: z.string(), 
          schema: z.string() 
        }) 
      },
      output: { 
        schema: z.object({ 
          complexity: z.enum(['simple', 'complex']).describe('Whether this requires simple or complex processing'),
          reasoning: z.string().describe('Explanation of why this complexity was chosen'),
          requiresMultipleQueries: z.boolean().describe('Whether multiple SQL queries are needed'),
          requiresAnalysis: z.boolean().describe('Whether the answer requires analysis or synthesis'),
        }) 
      },
      prompt: `Eres un experto analizador de consultas de base de datos. Tu tarea es determinar si una pregunta del usuario requiere procesamiento simple o complejo.

CRITERIOS PARA CLASIFICACIÓN:

SIMPLE: 
- Preguntas directas que se pueden responder con una sola consulta SQL
- Solicitudes de datos específicos (conteos, listas, valores únicos)
- Preguntas que no requieren análisis o síntesis de múltiples fuentes
- Ejemplos: "¿Cuántos usuarios hay?", "Lista los concursos activos", "¿Cuál es el email del usuario con ID 5?"

COMPLEJO:
- Preguntas que requieren múltiples consultas SQL relacionadas
- Solicitudes de análisis, comparaciones o tendencias
- Preguntas que requieren síntesis de información de múltiples tablas
- Preguntas abiertas que requieren interpretación
- Ejemplos: "Analiza el rendimiento de los concursos", "¿Qué patrones ves en las inscripciones?", "Compara los usuarios más activos"

Esquema de la Base de Datos:
{{{schema}}}

Pregunta del Usuario:
{{{question}}}

Analiza la pregunta y determina su complejidad:`,
      config: { temperature: 0.1 }
    });

    const { output: complexityOutput } = await complexityAnalyzer({ question, schema: schemaString });
    
    if (!complexityOutput) {
      return {
        answer: 'No se pudo analizar la complejidad de la consulta.',
        queryType: 'simple' as const,
        sqlQueries: [],
        processingTime: `${Date.now() - startTime}`,
        queryQuality: 'Low',
      };
    }

    // Step 2: Route to appropriate processing method
    if (complexityOutput.complexity === 'simple') {
      return await processSimpleQuery(question, schemaString, startTime);
    } else {
      return await processComplexQuery(question, schemaString, startTime);
    }
  }
);

async function processSimpleQuery(
  question: string, 
  schemaString: string, 
  startTime: number
): Promise<IntelligentQueryOutput> {
  const sqlGenerator = ai.definePrompt({
    name: 'simpleQueryGenerator',
    input: { 
      schema: z.object({ 
        question: z.string(), 
        schema: z.string() 
      }) 
    },
    output: { 
      schema: z.object({ 
        sqlQuery: z.string().describe('The SQL query to execute') 
      }) 
    },
    prompt: `Eres un experto en SQL. Traduce la siguiente pregunta en lenguaje natural al español a una consulta SQL que se pueda ejecutar en una base de datos MySQL.

Esquema de la Base de Datos:
{{{schema}}}

Pregunta: {{{question}}}

Genera una consulta SQL precisa y eficiente:`,
    config: { temperature: 0.1 }
  });

  const { output } = await sqlGenerator({ question, schema: schemaString });
  const sqlQuery = output?.sqlQuery ?? '';

  if (!sqlQuery) {
    return {
      answer: 'No se pudo generar una consulta SQL para esa pregunta.',
      queryType: 'simple' as const,
      sqlQueries: [],
      processingTime: `${Date.now() - startTime}`,
      queryQuality: 'Low',
    };
  }

  try {
    const results = await executeQuery(sqlQuery);
    const resultsString = JSON.stringify(results, null, 2);

    if (Array.isArray(results) && results.length === 0) {
      return {
        answer: "La consulta no devolvió resultados.",
        queryType: 'simple' as const,
        sqlQueries: [sqlQuery],
        processingTime: `${Date.now() - startTime}`,
        queryQuality: 'Medium',
      };
    }

    const summary = await summarizeQueryResults({
      query: question,
      results: resultsString,
    });

    return {
      answer: summary.summary,
      queryType: 'simple' as const,
      sqlQueries: [sqlQuery],
      processingTime: `${Date.now() - startTime}`,
      queryQuality: 'High',
    };
  } catch (error: any) {
    console.error("Error executing simple query:", error);
    return {
      answer: `Hubo un error al ejecutar la consulta: ${error.message}`,
      queryType: 'simple' as const,
      sqlQueries: [sqlQuery],
      processingTime: `${Date.now() - startTime}`,
      queryQuality: 'Low',
    };
  }
}

async function processComplexQuery(
  question: string, 
  schemaString: string, 
  startTime: number
): Promise<IntelligentQueryOutput> {
  const planner = ai.definePrompt({
    name: 'complexQueryPlanner',
    input: { 
      schema: z.object({ 
        question: z.string(), 
        schema: z.string() 
      }) 
    },
    output: { 
      schema: z.object({ 
        plan: z.string().describe("A step-by-step plan to answer the question"),
        subQueries: z.array(z.object({
          id: z.string().describe("A unique identifier for the sub-query"),
          query: z.string().describe("A specific SQL query to execute"),
          dependency: z.string().optional().describe("The ID of a sub-query this query depends on"),
          description: z.string().describe("A description of what this query achieves"),
        })),
      }) 
    },
    prompt: `Eres un asistente experto que responde preguntas complejas sobre una base de datos.
Tu tarea es descomponer una pregunta compleja del usuario en una serie de subconsultas SQL ejecutables.

Tu plan debe describir cómo usarás los resultados de estas subconsultas para construir una respuesta final sintetizada.

Esquema de la Base de Datos:
{{{schema}}}

Pregunta del Usuario:
{{{question}}}

Crea un plan detallado con subconsultas SQL:`,
    config: { temperature: 0.1 }
  });

  const { output: planOutput } = await planner({ question, schema: schemaString });
  
  if (!planOutput || planOutput.subQueries.length === 0) {
    return {
      answer: 'No se pudo crear un plan para responder tu pregunta. Por favor, reformúlala.',
      queryType: 'complex' as const,
      sqlQueries: [],
      processingTime: `${Date.now() - startTime}`,
      queryQuality: 'Low',
    };
  }

  const queryResults: Record<string, any> = {};
  const executedQueries: string[] = [];

  // Execute sub-queries
  for (const subQuery of planOutput.subQueries) {
    let currentQuery = subQuery.query;
    
    // Handle dependencies
    if (subQuery.dependency && queryResults[subQuery.dependency]) {
      const dependentResult = queryResults[subQuery.dependency];
      if (Array.isArray(dependentResult) && dependentResult.length > 0) {
        const ids = dependentResult.map(r => 
          typeof r.id === 'number' ? r.id : `'${r.id}'`
        ).join(',');
        currentQuery = currentQuery.replace(`'{{{${subQuery.dependency}.ids}}}'`, `(${ids})`);
      }
    }
    
    try {
      queryResults[subQuery.id] = await executeQuery(currentQuery);
      executedQueries.push(currentQuery);
    } catch (e: any) {
      queryResults[subQuery.id] = { error: e.message };
      executedQueries.push(currentQuery);
    }
  }

  // Synthesize final answer
  const synthesizer = ai.definePrompt({
    name: 'complexQuerySynthesizer',
    input: { 
      schema: z.object({ 
        question: z.string(), 
        plan: z.string(), 
        results: z.string() 
      }) 
    },
    output: { 
      schema: z.object({ 
        finalAnswer: z.string().describe('The comprehensive final answer') 
      }) 
    },
    prompt: `Eres un asistente de IA. Tu objetivo es sintetizar una respuesta final y legible para la pregunta del usuario basándote en un plan y los resultados de varias consultas SQL.

Pregunta Original del Usuario:
{{{question}}}

Tu Plan de Ejecución:
{{{plan}}}

Resultados de las Consultas (en formato JSON):
{{{results}}}

---
Basándote en el plan y los datos de los resultados de las consultas, proporciona una respuesta comprensiva, bien estructurada y fácil de entender a la pregunta original del usuario. No solo repitas los datos; interprétalos y presenta las ideas clave.

Respuesta Final:`,
    config: { temperature: 0.7 }
  });

  const { output: finalOutput } = await synthesizer({
    question,
    plan: planOutput.plan,
    results: JSON.stringify(queryResults, null, 2),
  });

  return {
    answer: finalOutput?.finalAnswer ?? 'No se pudo sintetizar una respuesta final.',
    queryType: 'complex' as const,
    sqlQueries: executedQueries,
    processingTime: `${Date.now() - startTime}`,
    queryQuality: 'High',
  };
}

// ============================================================================
// ENHANCED PROCESSING FUNCTIONS
// ============================================================================

async function processSimpleQueryEnhanced(
  question: string,
  schemaString: string,
  intentAnalysis: any,
  startTime: number
): Promise<IntelligentQueryOutput> {
  try {
    // Use specialized SQL generation
    const { output: sqlGeneration } = await optimizedSQLGenerationPrompt({
      intentAnalysis: JSON.stringify(intentAnalysis),
      dbSchema: schemaString,
      userQuery: question,
      performanceConstraints: 'Optimize for fast execution with minimal resource usage'
    });

    if (!sqlGeneration.sqlQuery) {
      return {
        answer: 'No se pudo generar una consulta SQL para esa pregunta.',
        queryType: 'simple' as const,
        sqlQueries: [],
        processingTime: `${Date.now() - startTime}`,
        queryQuality: 'Low',
      };
    }

    // Execute the optimized query
    const results = await executeQuery(sqlGeneration.sqlQuery);
    const resultsString = JSON.stringify(results, null, 2);

    if (Array.isArray(results) && results.length === 0) {
      return {
        answer: "La consulta no devolvió resultados.",
        queryType: 'simple' as const,
        sqlQueries: [sqlGeneration.sqlQuery],
        processingTime: `${Date.now() - startTime}`,
        queryQuality: 'Medium',
      };
    }

    // Use context analysis for better response
    const { output: contextAnalysis } = await contextAnalysisPrompt({
      originalQuery: question,
      queryResults: resultsString,
      intentAnalysis: JSON.stringify(intentAnalysis),
      businessContext: 'Sistema de concursos públicos del Ministerio Público de la Defensa'
    });

    return {
      answer: contextAnalysis.synthesizedResponse,
      queryType: 'simple' as const,
      sqlQueries: [sqlGeneration.sqlQuery],
      processingTime: `${Date.now() - startTime}`,
      queryQuality: 'High',
    };

  } catch (error: any) {
    console.error("Error in enhanced simple query processing:", error);
    
    // Fallback to original simple processing
    return await processSimpleQuery(question, schemaString, startTime);
  }
}

async function processModerateQueryEnhanced(
  question: string,
  schemaString: string,
  intentAnalysis: any,
  startTime: number
): Promise<IntelligentQueryOutput> {
  try {
    // Use specialized workflow orchestrator for moderate complexity
    const workflowResult = await specializedPromptOrchestrator.executeSpecializedWorkflow(
      question,
      schemaString,
      ''
    );

    // Execute SQL if generated
    let queryResults: any = null;
    let executedQueries: string[] = [];

    if (workflowResult.sqlGeneration?.sqlQuery) {
      try {
        queryResults = await executeQuery(workflowResult.sqlGeneration.sqlQuery);
        executedQueries.push(workflowResult.sqlGeneration.sqlQuery);
      } catch (error: any) {
        console.error("Error executing moderate query:", error);
        return {
          answer: `Error al ejecutar la consulta: ${error.message}`,
          queryType: 'complex' as const,
          sqlQueries: executedQueries,
          processingTime: `${Date.now() - startTime}`,
          queryQuality: 'Low',
        };
      }
    }

    return {
      answer: workflowResult.finalResponse,
      queryType: 'complex' as const,
      sqlQueries: executedQueries,
      processingTime: `${Date.now() - startTime}`,
      queryQuality: workflowResult.processingMetrics.qualityScore > 0.8 ? 'High' : 'Medium',
    };

  } catch (error: any) {
    console.error("Error in enhanced moderate query processing:", error);
    
    // Fallback to complex processing
    return await processComplexQuery(question, schemaString, startTime);
  }
}

async function processComplexQueryEnhanced(
  question: string,
  schemaString: string,
  intentAnalysis: any,
  startTime: number
): Promise<IntelligentQueryOutput> {
  try {
    // Use iterative query resolver for complex queries
    const iterativeResult = await iterativeQueryResolver({
      query: question,
      context: {
        conversationHistory: '',
        userPreferences: {
          maxIterations: 8,
          timeoutMs: 45000,
          detailLevel: 'comprehensive'
        }
      }
    });

    // Extract SQL queries from resolution path
    const sqlQueries: string[] = [];
    iterativeResult.resolutionPath.forEach(step => {
      try {
        const stepResult = JSON.parse(step.result);
        if (stepResult.sqlQuery) {
          sqlQueries.push(stepResult.sqlQuery);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    });

    return {
      answer: iterativeResult.finalAnswer,
      queryType: 'complex' as const,
      sqlQueries,
      processingTime: `${iterativeResult.qualityMetrics.totalExecutionTime}`,
      queryQuality: iterativeResult.qualityMetrics.completeness > 0.8 ? 'High' : 'Medium',
    };

  } catch (error: any) {
    console.error("Error in enhanced complex query processing:", error);
    
    // Fallback to original complex processing
    return await processComplexQuery(question, schemaString, startTime);
  }
}

async function fallbackToOriginalFlow(
  question: string,
  schemaString: string,
  startTime: number
): Promise<IntelligentQueryOutput> {
  console.log('Falling back to original query processing flow');
  
  // Use the original flow as fallback
  return await intelligentQueryFlow({ question });
}