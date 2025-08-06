// src/ai/unified.ts

/**
 * @fileOverview Unified AI interface that replaces the Genkit-based approach
 * This provides a provider-agnostic way to interact with AI models
 */

import { z } from 'zod';
import { aiProviderManager } from './providers/manager';
import { SupportedProvider, GenerateOptions } from './providers/types';
import { getEmbeddingService, EmbeddingService } from './embeddings';

export interface UnifiedAIOptions extends GenerateOptions {
  provider?: SupportedProvider;
}

export class UnifiedAI {
  private embeddingService: EmbeddingService | null = null;

  /**
   * Get embedding service instance
   */
  private async getEmbeddingService(): Promise<EmbeddingService> {
    if (!this.embeddingService) {
      this.embeddingService = await getEmbeddingService();
    }
    return this.embeddingService;
  }

  /**
   * Generate text using the specified or default AI provider
   */
  async generate(prompt: string, options?: UnifiedAIOptions): Promise<string> {
    const provider = aiProviderManager.getProvider(options?.provider);
    const response = await provider.generate(prompt, options);
    return response.text;
  }

  /**
   * Generate structured output using a Zod schema
   */
  async generateWithSchema<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: UnifiedAIOptions
  ): Promise<T> {
    const provider = aiProviderManager.getProvider(options?.provider);
    return await provider.generateWithSchema(prompt, schema, options);
  }

  /**
   * Define a reusable prompt template
   */
  definePrompt<TInput extends Record<string, any>, TOutput>(config: {
    name: string;
    input: { schema: z.ZodSchema<TInput> };
    output: { schema: z.ZodSchema<TOutput> };
    prompt: string;
    config?: UnifiedAIOptions;
  }) {
    return async (input: TInput): Promise<{ output: TOutput }> => {
      // Validate input
      const validatedInput = config.input.schema.parse(input);
      
      // Replace template variables in prompt
      let processedPrompt = config.prompt;
      for (const [key, value] of Object.entries(validatedInput)) {
        const placeholder = `{{{${key}}}}`;
        processedPrompt = processedPrompt.replace(new RegExp(placeholder, 'g'), String(value));
      }

      // Generate response with schema
      const output = await this.generateWithSchema(
        processedPrompt,
        config.output.schema,
        config.config
      );

      return { output };
    };
  }

  /**
   * Define a flow (similar to Genkit flows but provider-agnostic)
   */
  defineFlow<TInput, TOutput>(config: {
    name: string;
    inputSchema: z.ZodSchema<TInput>;
    outputSchema: z.ZodSchema<TOutput>;
  }, handler: (input: TInput) => Promise<TOutput>) {
    return async (input: TInput): Promise<TOutput> => {
      // Validate input
      const validatedInput = config.inputSchema.parse(input);
      
      // Execute handler
      const result = await handler(validatedInput);
      
      // Validate output
      return config.outputSchema.parse(result);
    };
  }

  /**
   * Get information about available providers
   */
  getProviderInfo() {
    return {
      available: aiProviderManager.getAvailableProviders().map(p => p.name),
      default: aiProviderManager.getDefaultProviderName(),
      status: aiProviderManager.getProviderStatus()
    };
  }

  /**
   * Set the default provider
   */
  setDefaultProvider(provider: SupportedProvider) {
    aiProviderManager.setDefaultProvider(provider);
  }

  /**
   * Generate with memory - uses embeddings to find relevant context
   */
  async generateWithMemory(
    prompt: string, 
    options?: UnifiedAIOptions & {
      useMemory?: boolean;
      storeInMemory?: boolean;
      contextTopK?: number;
      contextMinSimilarity?: number;
      userId?: string;
      sessionId?: string;
    }
  ): Promise<{ text: string; context?: any[]; memoryId?: string }> {
    const { 
      useMemory = true, 
      storeInMemory = true, 
      contextTopK = 5, 
      contextMinSimilarity = 0.5,
      userId,
      sessionId,
      ...generateOptions 
    } = options || {};

    let contextText = '';
    let relevantContext: any[] = [];

    // Find relevant context from memory if enabled
    if (useMemory) {
      const embeddingService = await this.getEmbeddingService();
      
      // Find similar queries and relevant context
      const [similarQueries, contextResults] = await Promise.all([
        embeddingService.findSimilarQueries(prompt, {
          topK: Math.ceil(contextTopK / 2),
          minSimilarity: contextMinSimilarity,
          includeResponses: true,
          userId,
          sessionId,
        }),
        embeddingService.findRelevantContext(prompt, {
          topK: Math.ceil(contextTopK / 2),
          minSimilarity: contextMinSimilarity,
        }),
      ]);

      relevantContext = [...similarQueries, ...contextResults];

      // Build context text
      if (relevantContext.length > 0) {
        contextText = '\n\nContexto relevante de consultas anteriores:\n';
        relevantContext.forEach((item, index) => {
          if ('query' in item) {
            // Similar query
            contextText += `${index + 1}. Consulta: "${item.query}"\n   Respuesta: "${item.response}"\n`;
          } else {
            // Context document
            contextText += `${index + 1}. Contexto: "${item.document.text.substring(0, 200)}..."\n`;
          }
        });
      }
    }

    // Generate response with context
    const enhancedPrompt = contextText ? `${prompt}${contextText}` : prompt;
    const provider = aiProviderManager.getProvider(generateOptions?.provider);
    const response = await provider.generate(enhancedPrompt, generateOptions);

    let memoryId: string | undefined;

    // Store in memory if enabled
    if (storeInMemory) {
      const embeddingService = await this.getEmbeddingService();
      const result = await embeddingService.storeQueryResponse({
        query: prompt,
        response: response.text,
        metadata: {
          userId,
          sessionId,
          timestamp: Date.now(),
          source: 'unified-ai',
          provider: generateOptions?.provider || 'default',
        },
      });
      memoryId = result.queryId;
    }

    return {
      text: response.text,
      context: relevantContext.length > 0 ? relevantContext : undefined,
      memoryId,
    };
  }

  /**
   * Store context information in memory
   */
  async storeContext(
    text: string,
    metadata: {
      source: string;
      type?: string;
      category?: string;
      [key: string]: any;
    }
  ): Promise<string> {
    const embeddingService = await this.getEmbeddingService();
    return await embeddingService.storeContext(text, metadata);
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats() {
    const embeddingService = await this.getEmbeddingService();
    return await embeddingService.getMemoryStats();
  }

  /**
   * Clean up old memories
   */
  async cleanupMemory(options?: {
    maxAge?: number;
    maxEntries?: number;
    keepImportantQueries?: boolean;
  }) {
    const embeddingService = await this.getEmbeddingService();
    return await embeddingService.cleanupMemory(options);
  }
}

// Export singleton instance
export const ai = new UnifiedAI();