// src/ai/providers/types.ts

/**
 * @fileOverview Type definitions for AI provider abstraction layer
 */

import { z } from 'zod';

export interface AIProviderConfig {
  name: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

export interface GenerateResponse {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface AIProvider {
  name: string;
  isConfigured(): boolean;
  generate(prompt: string, options?: GenerateOptions): Promise<GenerateResponse>;
  generateWithSchema<T>(
    prompt: string, 
    schema: z.ZodSchema<T>, 
    options?: GenerateOptions
  ): Promise<T>;
}

export type SupportedProvider = 'gemini' | 'openai' | 'claude';

export interface AIProviderManager {
  getProvider(name?: SupportedProvider): AIProvider;
  getAvailableProviders(): AIProvider[];
  setDefaultProvider(name: SupportedProvider): void;
  getDefaultProvider(): AIProvider;
}