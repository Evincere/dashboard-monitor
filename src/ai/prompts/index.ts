// src/ai/prompts/index.ts

/**
 * @fileOverview Specialized Prompting System - Main Export
 * Provides a unified interface for all specialized prompting capabilities
 */

// Core specialized prompts
export {
  specializedPromptOrchestrator,
  intentDiscoveryPrompt,
  optimizedSQLGenerationPrompt,
  contextAnalysisPrompt,
  iterativeResolutionPrompt,
  type IntentDiscoveryResult,
  type OptimizedSQLResult,
  type ContextAnalysisResult,
  type IterativeResolutionResult,
  IntentDiscoverySchema,
  OptimizedSQLSchema,
  ContextAnalysisSchema,
  IterativeResolutionSchema
} from './specialized-prompts';

// Prompt management system
export {
  promptManager,
  SPECIALIZED_PROMPTS,
  type PromptConfig,
  type PromptCategory,
  type PromptExample
} from './prompt-manager';

// Configuration system
export {
  promptConfigManager,
  PROMPT_TEMPLATES,
  type PromptTemplate,
  type PromptParameter,
  type PromptExecutionConfig,
  type PromptMetadata
} from './prompt-config';

// Iterative query resolution
export {
  queryResolver,
  iterativeQueryResolver,
  type IterativeQueryInput,
  type IterativeQueryOutput,
  type QueryStep,
  type ResolutionContext,
  type ResolutionState
} from '../flows/iterative-query-resolver';

// ============================================================================
// UNIFIED SPECIALIZED PROMPTING INTERFACE
// ============================================================================

import { specializedPromptOrchestrator } from './specialized-prompts';
import { promptManager } from './prompt-manager';
import { promptConfigManager } from './prompt-config';
import { queryResolver } from '../flows/iterative-query-resolver';
import { SupportedProvider } from '../providers/types';
import { ZodType } from 'zod';

/**
 * Unified interface for all specialized prompting capabilities
 */
export class SpecializedPromptingSystem {
  /**
   * Execute a complete specialized workflow for a user query
   */
  async processQuery(
    userQuery: string,
    options?: {
      dbSchema?: string;
      conversationHistory?: string;
      provider?: SupportedProvider;
      complexity?: 'auto' | 'simple' | 'moderate' | 'complex';
      useIterativeResolution?: boolean;
      maxIterations?: number;
      timeoutMs?: number;
    }
  ) {
    const dbSchema = options?.dbSchema || await this.getDbSchema();

    if (options?.useIterativeResolution || options?.complexity === 'complex') {
      return await queryResolver.resolveQuery({
        query: userQuery,
        context: {
          conversationHistory: options?.conversationHistory,
          userPreferences: {
            maxIterations: options?.maxIterations || 10,
            timeoutMs: options?.timeoutMs || 60000,
            detailLevel: 'comprehensive'
          }
        }
      });
    }

    return await specializedPromptOrchestrator.executeSpecializedWorkflow(
      userQuery,
      dbSchema,
      options?.conversationHistory
    );
  }

  /**
   * Execute a specific prompt template with parameters
   */
  async executeTemplate<T>(
    templateId: string,
    parameters: Record<string, any>,
    outputSchema: ZodType<T>,
    options?: {
      provider?: SupportedProvider;
      useCache?: boolean;
      timeout?: number;
    }
  ): Promise<T> {
    const result = await promptManager.executePrompt(
      templateId,
      parameters,
      outputSchema,
      options
    );
    return outputSchema.parse(result.output);
  }

  /**
   * Analyze query intent using specialized prompts
   */
  async analyzeIntent(
    userQuery: string,
    dbSchema: string,
    conversationHistory?: string
  ) {
    const prompt = promptConfigManager.buildPrompt('intent_classifier_v2', {
      userQuery,
      dbSchema,
      sessionHistory: conversationHistory || '',
      userRole: 'administrator',
      temporalContext: 'normal_operation'
    });

    // Use the configured execution settings
    const config = promptConfigManager.getExecutionConfig('intent_classifier_v2');

    return await promptManager.executePrompt(
      'intent_classifier',
      { userQuery, dbSchema, conversationHistory },
      // Schema would be imported from specialized-prompts
      {} as any, // Placeholder - would use actual schema
      {
        provider: config?.provider,
        useCache: config?.cacheEnabled,
        timeout: config?.timeout
      }
    );
  }

  /**
   * Generate optimized SQL using specialized prompts
   */
  async generateOptimizedSQL(
    userQuery: string,
    intentAnalysis: string,
    dbSchema: string,
    performanceConstraints?: string
  ) {
    return await promptManager.executePrompt(
      'sql_optimizer',
      {
        userQuery,
        intentAnalysis,
        dbSchema,
        performanceConstraints: performanceConstraints || 'Standard performance requirements'
      },
      {} as any, // Placeholder - would use actual schema
      {
        useCache: true,
        timeout: 20000
      }
    );
  }

  /**
   * Perform context analysis on query results
   */
  async analyzeContext(
    originalQuery: string,
    queryResults: string,
    intentAnalysis: string,
    businessContext?: string
  ) {
    return await promptManager.executePrompt(
      'data_interpreter',
      {
        originalQuery,
        queryResults,
        intentAnalysis,
        businessContext: businessContext || 'Sistema de concursos públicos del MPD'
      },
      {} as any, // Placeholder - would use actual schema
      {
        useCache: false, // Context analysis should be fresh
        timeout: 25000
      }
    );
  }

  /**
   * Get system performance metrics
   */
  getPerformanceMetrics() {
    return {
      promptManager: promptManager.getUsageStats(),
      templates: promptConfigManager.getPerformanceStats(),
      orchestrator: {
        // Add orchestrator-specific metrics
        totalWorkflows: 0,
        avgWorkflowTime: 0,
        successRate: 0
      }
    };
  }

  /**
   * Configure system settings
   */
  configure(settings: {
    defaultProvider?: SupportedProvider;
    cacheEnabled?: boolean;
    defaultTimeout?: number;
    maxIterations?: number;
  }) {
    // Apply configuration settings to all components
    if (settings.defaultProvider) {
      // Set default provider for all prompt managers
    }

    if (settings.cacheEnabled !== undefined) {
      // Configure caching for all components
    }

    // Apply other settings...
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    promptManager.clearCache();
    // Clear other component caches...
  }

  /**
   * Get database schema (placeholder - would integrate with actual database service)
   */
  private async getDbSchema(): Promise<string> {
    // This would integrate with the actual database service
    // For now, return a placeholder
    return JSON.stringify({
      users: { id: 'int', name: 'varchar', email: 'varchar', status: 'enum' },
      contests: { id: 'int', title: 'varchar', status: 'enum', created_at: 'datetime' },
      applications: { id: 'int', user_id: 'int', contest_id: 'int', status: 'enum' }
    }, null, 2);
  }
}

// Export singleton instance
export const specializedPromptingSystem = new SpecializedPromptingSystem();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick access function for simple query processing
 */
export async function processSimpleQuery(
  userQuery: string,
  options?: {
    provider?: SupportedProvider;
    useCache?: boolean;
  }
) {
  return await specializedPromptingSystem.processQuery(userQuery, {
    complexity: 'simple',
    ...options
  });
}

/**
 * Quick access function for complex query processing
 */
export async function processComplexQuery(
  userQuery: string,
  options?: {
    provider?: SupportedProvider;
    maxIterations?: number;
    timeoutMs?: number;
  }
) {
  return await specializedPromptingSystem.processQuery(userQuery, {
    complexity: 'complex',
    useIterativeResolution: true,
    ...options
  });
}

/**
 * Quick access function for intent analysis
 */
export async function analyzeQueryIntent(
  userQuery: string,
  dbSchema?: string,
  conversationHistory?: string
) {
  return await specializedPromptingSystem.analyzeIntent(
    userQuery,
    dbSchema || await specializedPromptingSystem['getDbSchema'](),
    conversationHistory
  );
}

/**
 * Get system health and performance information
 */
export function getSystemHealth() {
  return {
    status: 'operational',
    components: {
      orchestrator: 'healthy',
      promptManager: 'healthy',
      configManager: 'healthy',
      queryResolver: 'healthy'
    },
    metrics: specializedPromptingSystem.getPerformanceMetrics(),
    lastUpdated: new Date().toISOString()
  };
}