// src/ai/flows/iterative-query-resolver-class.ts

/**
 * @fileOverview Iterative Query Resolution Class
 * Contains the main IterativeQueryResolver class without 'use server' directive
 */

import { z } from 'zod';
import { ai } from '@/ai/unified';
import { executeQuery, getDbSchema } from '@/services/database';
import { 
  specializedPromptOrchestrator,
  IntentDiscoveryResult
} from '@/ai/prompts/specialized-prompts';

// ============================================================================
// ITERATIVE RESOLUTION TYPES
// ============================================================================

export interface QueryStep {
  id: string;
  type: 'data_collection' | 'analysis' | 'validation' | 'synthesis' | 'refinement';
  description: string;
  sqlQuery?: string;
  dependencies: string[];
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  executionTime?: number;
  retryCount: number;
  maxRetries: number;
}

export interface ResolutionContext {
  originalQuery: string;
  intentAnalysis: IntentDiscoveryResult;
  dbSchema: string;
  conversationHistory?: string;
  userPreferences?: {
    maxIterations?: number;
    timeoutMs?: number;
    detailLevel?: 'basic' | 'detailed' | 'comprehensive';
  };
}

export interface ResolutionState {
  sessionId: string;
  currentIteration: number;
  maxIterations: number;
  steps: QueryStep[];
  completedSteps: string[];
  failedSteps: string[];
  intermediateResults: Record<string, any>;
  qualityMetrics: {
    completeness: number;
    accuracy: number;
    efficiency: number;
    userSatisfaction?: number;
  };
  startTime: number;
  lastUpdateTime: number;
}

const IterativeQueryInputSchema = z.object({
  query: z.string().describe('The user query to resolve iteratively'),
  context: z.object({
    conversationHistory: z.string().optional(),
    userPreferences: z.object({
      maxIterations: z.number().optional(),
      timeoutMs: z.number().optional(),
      detailLevel: z.enum(['basic', 'detailed', 'comprehensive']).optional()
    }).optional()
  }).optional()
});

const IterativeQueryOutputSchema = z.object({
  finalAnswer: z.string().describe('The comprehensive final answer'),
  resolutionPath: z.array(z.object({
    stepId: z.string(),
    description: z.string(),
    result: z.string()
  })).describe('The path taken to resolve the query'),
  qualityMetrics: z.object({
    completeness: z.number(),
    accuracy: z.number(),
    efficiency: z.number(),
    totalIterations: z.number(),
    totalExecutionTime: z.number()
  }).describe('Quality metrics for the resolution process'),
  recommendations: z.array(z.string()).describe('Recommendations for similar queries'),
  debugInfo: z.object({
    stepsExecuted: z.number(),
    queriesExecuted: z.number(),
    errorsEncountered: z.number(),
    cacheHits: z.number()
  }).describe('Debug information for analysis')
});

export type IterativeQueryInput = z.infer<typeof IterativeQueryInputSchema>;
export type IterativeQueryOutput = z.infer<typeof IterativeQueryOutputSchema>;

// ============================================================================
// ITERATIVE QUERY RESOLVER CLASS
// ============================================================================

export class IterativeQueryResolver {
  private activeSessions: Map<string, ResolutionState> = new Map();
  private stepExecutors: Map<string, (step: QueryStep, context: ResolutionContext, state: ResolutionState) => Promise<any>> = new Map();

  constructor() {
    this.initializeStepExecutors();
  }

  /**
   * Main entry point for iterative query resolution
   */
  async resolveQuery(input: IterativeQueryInput): Promise<IterativeQueryOutput> {
    const sessionId = this.generateSessionId();
    const startTime = Date.now();

    try {
      // Initialize resolution context
      const context = await this.initializeContext(input);
      
      // Create initial resolution state
      const state = this.createInitialState(sessionId, context, startTime);
      this.activeSessions.set(sessionId, state);

      // Execute iterative resolution
      const result = await this.executeIterativeResolution(context, state);

      // Clean up session
      this.activeSessions.delete(sessionId);

      return result;

    } catch (error) {
      console.error(`Error in iterative query resolution (session: ${sessionId}):`, error);
      this.activeSessions.delete(sessionId);
      throw error;
    }
  }

  /**
   * Initialize resolution context with intent analysis and schema
   */
  private async initializeContext(input: IterativeQueryInput): Promise<ResolutionContext> {
    const dbSchema = await getDbSchema();
    const schemaString = JSON.stringify(dbSchema, null, 2);

    // Perform intent analysis
    const workflowResult = await specializedPromptOrchestrator.executeSpecializedWorkflow(
      input.query,
      schemaString,
      input.context?.conversationHistory
    );

    return {
      originalQuery: input.query,
      intentAnalysis: workflowResult.intentAnalysis,
      dbSchema: schemaString,
      conversationHistory: input.context?.conversationHistory,
      userPreferences: {
        maxIterations: input.context?.userPreferences?.maxIterations || 10,
        timeoutMs: input.context?.userPreferences?.timeoutMs || 60000,
        detailLevel: input.context?.userPreferences?.detailLevel || 'detailed'
      }
    };
  }

  /**
   * Create initial resolution state
   */
  private createInitialState(sessionId: string, context: ResolutionContext, startTime: number): ResolutionState {
    return {
      sessionId,
      currentIteration: 0,
      maxIterations: context.userPreferences?.maxIterations || 10,
      steps: [],
      completedSteps: [],
      failedSteps: [],
      intermediateResults: {},
      qualityMetrics: {
        completeness: 0,
        accuracy: 0,
        efficiency: 0
      },
      startTime,
      lastUpdateTime: startTime
    };
  }

  /**
   * Execute the main iterative resolution loop
   */
  private async executeIterativeResolution(
    context: ResolutionContext, 
    state: ResolutionState
  ): Promise<IterativeQueryOutput> {
    
    // Generate initial resolution plan
    await this.generateResolutionPlan(context, state);

    // Execute steps iteratively
    while (state.currentIteration < state.maxIterations && !this.isResolutionComplete(state)) {
      state.currentIteration++;
      state.lastUpdateTime = Date.now();

      // Check timeout
      if (Date.now() - state.startTime > (context.userPreferences?.timeoutMs || 60000)) {
        console.warn(`Resolution timeout reached for session ${state.sessionId}`);
        break;
      }

      // Execute next batch of steps
      await this.executeNextSteps(context, state);

      // Update quality metrics
      this.updateQualityMetrics(state);

      // Check if we need to refine the plan
      if (this.shouldRefinePlan(state)) {
        await this.refinePlan(context, state);
      }
    }

    // Generate final response
    return await this.generateFinalResponse(context, state);
  }

  /**
   * Generate initial resolution plan based on intent analysis
   */
  private async generateResolutionPlan(context: ResolutionContext, state: ResolutionState): Promise<void> {
    const plannerPrompt = ai.definePrompt({
      name: 'resolutionPlanner',
      input: { 
        schema: z.object({ 
          query: z.string(),
          intentAnalysis: z.string(),
          dbSchema: z.string()
        }) 
      },
      output: { 
        schema: z.object({ 
          steps: z.array(z.object({
            id: z.string(),
            type: z.enum(['data_collection', 'analysis', 'validation', 'synthesis', 'refinement']),
            description: z.string(),
            sqlQuery: z.string().optional(),
            dependencies: z.array(z.string()),
            priority: z.number().min(1).max(10)
          }))
        }) 
      },
      prompt: `Eres un planificador experto para resolución iterativa de consultas complejas del sistema MPD.

Consulta Original: {{{query}}}

Análisis de Intención:
{{{intentAnalysis}}}

Esquema de Base de Datos:
{{{dbSchema}}}

Crea un plan de resolución paso a paso que:
1. Descomponga la consulta en pasos manejables
2. Identifique dependencias entre pasos
3. Priorice pasos críticos
4. Considere la eficiencia del proceso

Tipos de pasos disponibles:
- data_collection: Recopilar datos específicos de la base de datos
- analysis: Analizar y procesar datos recopilados
- validation: Validar resultados y calidad de datos
- synthesis: Sintetizar información de múltiples fuentes
- refinement: Refinar resultados basado en feedback

Genera un plan detallado:`,
      config: { temperature: 0.2 }
    });

    const { output } = await plannerPrompt({
      query: context.originalQuery,
      intentAnalysis: JSON.stringify(context.intentAnalysis),
      dbSchema: context.dbSchema
    });

    // Convert plan to QueryStep objects
    state.steps = output.steps.map(step => ({
      id: step.id,
      type: step.type,
      description: step.description,
      sqlQuery: step.sqlQuery,
      dependencies: step.dependencies,
      status: 'pending' as const,
      retryCount: 0,
      maxRetries: 3
    }));
  }

  /**
   * Execute the next batch of ready steps
   */
  private async executeNextSteps(context: ResolutionContext, state: ResolutionState): Promise<void> {
    const readySteps = this.getReadySteps(state);
    
    // Execute steps in parallel where possible
    const executionPromises = readySteps.map(step => this.executeStep(step, context, state));
    
    await Promise.allSettled(executionPromises);
  }

  /**
   * Get steps that are ready to execute (dependencies satisfied)
   */
  private getReadySteps(state: ResolutionState): QueryStep[] {
    return state.steps.filter(step => 
      step.status === 'pending' && 
      step.dependencies.every(dep => state.completedSteps.includes(dep))
    );
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: QueryStep, context: ResolutionContext, state: ResolutionState): Promise<void> {
    const startTime = Date.now();
    step.status = 'executing';

    try {
      const executor = this.stepExecutors.get(step.type);
      if (!executor) {
        throw new Error(`No executor found for step type: ${step.type}`);
      }

      const result = await executor(step, context, state);
      
      step.result = result;
      step.status = 'completed';
      step.executionTime = Date.now() - startTime;
      
      state.completedSteps.push(step.id);
      state.intermediateResults[step.id] = result;

    } catch (error) {
      console.error(`Error executing step ${step.id}:`, error);
      
      step.error = error instanceof Error ? error.message : String(error);
      step.retryCount++;

      if (step.retryCount < step.maxRetries) {
        step.status = 'pending'; // Retry
      } else {
        step.status = 'failed';
        state.failedSteps.push(step.id);
      }
    }
  }

  /**
   * Initialize step executors
   */
  private initializeStepExecutors(): void {
    this.stepExecutors.set('data_collection', this.executeDataCollection.bind(this));
    this.stepExecutors.set('analysis', this.executeAnalysis.bind(this));
    this.stepExecutors.set('validation', this.executeValidation.bind(this));
    this.stepExecutors.set('synthesis', this.executeSynthesis.bind(this));
    this.stepExecutors.set('refinement', this.executeRefinement.bind(this));
  }

  /**
   * Execute data collection step
   */
  private async executeDataCollection(step: QueryStep, context: ResolutionContext, state: ResolutionState): Promise<any> {
    if (!step.sqlQuery) {
      throw new Error('Data collection step requires SQL query');
    }

    // Replace dependency placeholders in SQL
    let processedQuery = step.sqlQuery;
    for (const dep of step.dependencies) {
      const depResult = state.intermediateResults[dep];
      if (depResult && Array.isArray(depResult)) {
        const ids = depResult.map(r => typeof r.id === 'number' ? r.id : `'${r.id}'`).join(',');
        processedQuery = processedQuery.replace(`{{{${dep}.ids}}}`, `(${ids})`);
      }
    }

    return await executeQuery(processedQuery);
  }

  /**
   * Execute analysis step
   */
  private async executeAnalysis(step: QueryStep, context: ResolutionContext, state: ResolutionState): Promise<any> {
    const relevantData = step.dependencies.map(dep => state.intermediateResults[dep]).filter(Boolean);
    
    const analysisPrompt = ai.definePrompt({
      name: 'dataAnalyzer',
      input: { 
        schema: z.object({ 
          description: z.string(),
          data: z.string(),
          context: z.string()
        }) 
      },
      output: { 
        schema: z.object({ 
          insights: z.array(z.string()),
          patterns: z.array(z.string()),
          anomalies: z.array(z.string()),
          summary: z.string()
        }) 
      },
      prompt: `Analiza los siguientes datos en el contexto del sistema MPD:

Descripción del análisis: {{{description}}}

Datos a analizar:
{{{data}}}

Contexto de la consulta:
{{{context}}}

Proporciona insights, patrones identificados, anomalías y un resumen:`,
      config: { temperature: 0.3 }
    });

    const { output } = await analysisPrompt({
      description: step.description,
      data: JSON.stringify(relevantData, null, 2),
      context: context.originalQuery
    });

    return output;
  }

  /**
   * Execute validation step
   */
  private async executeValidation(step: QueryStep, context: ResolutionContext, state: ResolutionState): Promise<any> {
    const dataToValidate = step.dependencies.map(dep => state.intermediateResults[dep]).filter(Boolean);
    
    // Implement data quality validation logic
    const validation = {
      completeness: this.calculateCompleteness(dataToValidate),
      consistency: this.calculateConsistency(dataToValidate),
      accuracy: this.calculateAccuracy(dataToValidate),
      issues: this.identifyDataIssues(dataToValidate)
    };

    return validation;
  }

  /**
   * Execute synthesis step
   */
  private async executeSynthesis(step: QueryStep, context: ResolutionContext, state: ResolutionState): Promise<any> {
    const allResults = step.dependencies.map(dep => ({
      stepId: dep,
      result: state.intermediateResults[dep]
    }));

    const synthesisPrompt = ai.definePrompt({
      name: 'resultSynthesizer',
      input: { 
        schema: z.object({ 
          originalQuery: z.string(),
          results: z.string(),
          description: z.string()
        }) 
      },
      output: { 
        schema: z.object({ 
          synthesizedAnswer: z.string(),
          keyFindings: z.array(z.string()),
          recommendations: z.array(z.string()),
          confidence: z.number().min(0).max(1)
        }) 
      },
      prompt: `Sintetiza los siguientes resultados para responder la consulta original:

Consulta Original: {{{originalQuery}}}

Descripción de la síntesis: {{{description}}}

Resultados a sintetizar:
{{{results}}}

Proporciona una respuesta sintetizada, hallazgos clave y recomendaciones:`,
      config: { temperature: 0.4 }
    });

    const { output } = await synthesisPrompt({
      originalQuery: context.originalQuery,
      results: JSON.stringify(allResults, null, 2),
      description: step.description
    });

    return output;
  }

  /**
   * Execute refinement step
   */
  private async executeRefinement(step: QueryStep, context: ResolutionContext, state: ResolutionState): Promise<any> {
    // Implement refinement logic based on quality metrics and user feedback
    const currentQuality = state.qualityMetrics;
    
    if (currentQuality.completeness < 0.8) {
      // Add more data collection steps
      return { action: 'add_data_collection', reason: 'Low completeness score' };
    }
    
    if (currentQuality.accuracy < 0.8) {
      // Add validation steps
      return { action: 'add_validation', reason: 'Low accuracy score' };
    }

    return { action: 'no_refinement_needed', reason: 'Quality metrics are satisfactory' };
  }

  /**
   * Check if resolution is complete
   */
  private isResolutionComplete(state: ResolutionState): boolean {
    const allStepsCompleted = state.steps.every(step => 
      step.status === 'completed' || step.status === 'failed'
    );
    
    const qualityThreshold = 0.8;
    const qualityMet = state.qualityMetrics.completeness >= qualityThreshold &&
                      state.qualityMetrics.accuracy >= qualityThreshold;

    return allStepsCompleted && qualityMet;
  }

  /**
   * Update quality metrics based on current state
   */
  private updateQualityMetrics(state: ResolutionState): void {
    const totalSteps = state.steps.length;
    const completedSteps = state.completedSteps.length;
    const failedSteps = state.failedSteps.length;

    state.qualityMetrics.completeness = totalSteps > 0 ? completedSteps / totalSteps : 0;
    state.qualityMetrics.accuracy = totalSteps > 0 ? (completedSteps) / (completedSteps + failedSteps) : 0;
    state.qualityMetrics.efficiency = this.calculateEfficiency(state);
  }

  /**
   * Calculate efficiency metric
   */
  private calculateEfficiency(state: ResolutionState): number {
    const totalTime = Date.now() - state.startTime;
    const avgStepTime = totalTime / Math.max(state.completedSteps.length, 1);
    
    // Efficiency is inversely related to time and retry count
    const retryPenalty = state.steps.reduce((sum, step) => sum + step.retryCount, 0) * 0.1;
    const timePenalty = Math.min(avgStepTime / 1000, 1); // Normalize to seconds
    
    return Math.max(0, 1 - timePenalty - retryPenalty);
  }

  /**
   * Check if plan should be refined
   */
  private shouldRefinePlan(state: ResolutionState): boolean {
    return state.qualityMetrics.completeness < 0.6 || 
           state.qualityMetrics.accuracy < 0.6 ||
           state.failedSteps.length > state.completedSteps.length;
  }

  /**
   * Refine the resolution plan
   */
  private async refinePlan(context: ResolutionContext, state: ResolutionState): Promise<void> {
    // Implementation for plan refinement based on current state
    console.log(`Refining plan for session ${state.sessionId} at iteration ${state.currentIteration}`);
    
    // Add additional steps or modify existing ones based on quality metrics
    // This is a simplified implementation - could be much more sophisticated
  }

  /**
   * Generate final response
   */
  private async generateFinalResponse(context: ResolutionContext, state: ResolutionState): Promise<IterativeQueryOutput> {
    const completedResults = state.completedSteps.map(stepId => {
      const step = state.steps.find(s => s.id === stepId);
      return {
        stepId,
        description: step?.description || '',
        result: JSON.stringify(state.intermediateResults[stepId])
      };
    });

    // Find synthesis results for final answer
    const synthesisSteps = state.steps.filter(s => s.type === 'synthesis' && s.status === 'completed');
    let finalAnswer = 'No se pudo generar una respuesta completa.';
    
    if (synthesisSteps.length > 0) {
      const lastSynthesis = state.intermediateResults[synthesisSteps[synthesisSteps.length - 1].id];
      finalAnswer = lastSynthesis?.synthesizedAnswer || finalAnswer;
    }

    const totalExecutionTime = Date.now() - state.startTime;

    return {
      finalAnswer,
      resolutionPath: completedResults,
      qualityMetrics: {
        ...state.qualityMetrics,
        totalIterations: state.currentIteration,
        totalExecutionTime
      },
      recommendations: this.generateRecommendations(context, state),
      debugInfo: {
        stepsExecuted: state.completedSteps.length,
        queriesExecuted: state.steps.filter(s => s.sqlQuery).length,
        errorsEncountered: state.failedSteps.length,
        cacheHits: 0 // TODO: Implement cache hit tracking
      }
    };
  }

  /**
   * Generate recommendations for similar queries
   */
  private generateRecommendations(context: ResolutionContext, state: ResolutionState): string[] {
    const recommendations: string[] = [];
    
    if (state.qualityMetrics.efficiency < 0.7) {
      recommendations.push('Considera simplificar la consulta para mejorar el rendimiento');
    }
    
    if (state.failedSteps.length > 0) {
      recommendations.push('Algunos pasos fallaron - revisa la calidad de los datos');
    }
    
    if (state.currentIteration >= state.maxIterations) {
      recommendations.push('La consulta alcanzó el límite de iteraciones - considera dividirla en partes más pequeñas');
    }

    return recommendations;
  }

  // Helper methods for validation
  private calculateCompleteness(data: any[]): number {
    if (!data.length) return 0;
    
    let totalFields = 0;
    let filledFields = 0;
    
    data.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.values(item).forEach(value => {
          totalFields++;
          if (value !== null && value !== undefined && value !== '') {
            filledFields++;
          }
        });
      }
    });
    
    return totalFields > 0 ? filledFields / totalFields : 0;
  }

  private calculateConsistency(data: any[]): number {
    // Simplified consistency calculation
    return 0.9; // Placeholder
  }

  private calculateAccuracy(data: any[]): number {
    // Simplified accuracy calculation
    return 0.85; // Placeholder
  }

  private identifyDataIssues(data: any[]): string[] {
    const issues: string[] = [];
    
    if (data.length === 0) {
      issues.push('No data returned');
    }
    
    // Add more sophisticated data issue detection
    
    return issues;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}