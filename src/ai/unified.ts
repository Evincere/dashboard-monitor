// src/ai/unified.ts

/**
 * @fileOverview Unified AI interface that replaces the Genkit-based approach
 * This provides a provider-agnostic way to interact with AI models
 */

import { z } from 'zod';
import { aiProviderManager } from './providers/manager';
import { SupportedProvider, GenerateOptions } from './providers/types';

export interface UnifiedAIOptions extends GenerateOptions {
  provider?: SupportedProvider;
}

export class UnifiedAI {
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
}

// Export singleton instance
export const ai = new UnifiedAI();