// src/ai/flows/iterative-query-resolver.ts

/**
 * @fileOverview Iterative Query Resolution System - Server Functions
 * Contains server functions for iterative query resolution
 */

import { z } from 'zod';
import { ai } from '@/ai/unified';
import { 
  IterativeQueryResolver,
  type IterativeQueryInput,
  type IterativeQueryOutput,
  type QueryStep,
  type ResolutionContext,
  type ResolutionState
} from './iterative-query-resolver-class';

// Re-export types for convenience
export type {
  IterativeQueryInput,
  IterativeQueryOutput,
  QueryStep,
  ResolutionContext,
  ResolutionState
};

// Schema definitions
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

// ============================================================================
// FLOW DEFINITION
// ============================================================================

export async function iterativeQueryResolver(input: IterativeQueryInput): Promise<IterativeQueryOutput> {
    'use server';
    return iterativeQueryResolverFlow(input);
}

const iterativeQueryResolverFlow = ai.defineFlow(
    {
        name: 'iterativeQueryResolverFlow',
        inputSchema: IterativeQueryInputSchema,
        outputSchema: IterativeQueryOutputSchema,
    },
    async (input) => {
        const resolver = new IterativeQueryResolver();
        return await resolver.resolveQuery(input);
    }
);

// Export singleton instance
export const queryResolver = new IterativeQueryResolver();