// src/ai/providers/openai.ts

/**
 * @fileOverview OpenAI provider implementation
 */

import { z } from 'zod';
import { AIProvider, GenerateOptions, GenerateResponse } from './types';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider implements AIProvider {
  public readonly name = 'openai';
  private apiKey: string | null = null;
  private model: string;
  private baseUrl: string;

  constructor(apiKey?: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey || null;
    this.model = model;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI provider is not configured. Please provide an API key.');
    }

    try {
      const messages: OpenAIMessage[] = [
        { role: 'user', content: prompt }
      ];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens,
          top_p: options?.topP,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data: OpenAIResponse = await response.json();
      const text = data.choices[0]?.message?.content || '';

      return {
        text,
        usage: data.usage ? {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined
      };
    } catch (error: any) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  async generateWithSchema<T>(
    prompt: string, 
    schema: z.ZodSchema<T>, 
    options?: GenerateOptions
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('OpenAI provider is not configured. Please provide an API key.');
    }

    try {
      const messages: OpenAIMessage[] = [
        { 
          role: 'system', 
          content: 'You are a helpful assistant that responds with valid JSON according to the provided schema.' 
        },
        { 
          role: 'user', 
          content: `${prompt}\n\nPlease respond with valid JSON that matches this schema:\n${JSON.stringify(schema._def, null, 2)}` 
        }
      ];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens,
          top_p: options?.topP,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data: OpenAIResponse = await response.json();
      const text = data.choices[0]?.message?.content || '';

      try {
        const parsed = JSON.parse(text);
        return schema.parse(parsed);
      } catch (parseError) {
        throw new Error(`Failed to parse OpenAI response as valid JSON: ${parseError}`);
      }
    } catch (error: any) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
}