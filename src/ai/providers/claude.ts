// src/ai/providers/claude.ts

/**
 * @fileOverview Claude (Anthropic) provider implementation
 */

import { z } from 'zod';
import { AIProvider, GenerateOptions, GenerateResponse } from './types';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class ClaudeProvider implements AIProvider {
  public readonly name = 'claude';
  private apiKey: string | null = null;
  private model: string;
  private baseUrl: string;

  constructor(apiKey?: string, model: string = 'claude-3-5-sonnet-20241022') {
    this.apiKey = apiKey || null;
    this.model = model;
    this.baseUrl = 'https://api.anthropic.com/v1';
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResponse> {
    if (!this.apiKey) {
      throw new Error('Claude provider is not configured. Please provide an API key.');
    }

    try {
      const messages: ClaudeMessage[] = [
        { role: 'user', content: prompt }
      ];

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: options?.maxTokens ?? 4096,
          temperature: options?.temperature ?? 0.7,
          top_p: options?.topP,
          top_k: options?.topK,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data: ClaudeResponse = await response.json();
      const text = data.content[0]?.text || '';

      return {
        text,
        usage: data.usage ? {
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        } : undefined
      };
    } catch (error: any) {
      throw new Error(`Claude API error: ${error.message}`);
    }
  }

  async generateWithSchema<T>(
    prompt: string, 
    schema: z.ZodSchema<T>, 
    options?: GenerateOptions
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Claude provider is not configured. Please provide an API key.');
    }

    try {
      const messages: ClaudeMessage[] = [
        { 
          role: 'user', 
          content: `${prompt}\n\nPlease respond with valid JSON that matches this schema:\n${JSON.stringify(schema._def, null, 2)}\n\nIMPORTANT: Respond only with the JSON object, no additional text or formatting.` 
        }
      ];

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: options?.maxTokens ?? 4096,
          temperature: options?.temperature ?? 0.3,
          top_p: options?.topP,
          top_k: options?.topK,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data: ClaudeResponse = await response.json();
      const text = data.content[0]?.text || '';

      try {
        const parsed = JSON.parse(text);
        return schema.parse(parsed);
      } catch (parseError) {
        throw new Error(`Failed to parse Claude response as valid JSON: ${parseError}`);
      }
    } catch (error: any) {
      throw new Error(`Claude API error: ${error.message}`);
    }
  }
}