// src/ai/providers/gemini.ts

/**
 * @fileOverview Gemini AI provider implementation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { AIProvider, GenerateOptions, GenerateResponse } from './types';

export class GeminiProvider implements AIProvider {
  public readonly name = 'gemini';
  private client: GoogleGenerativeAI | null = null;
  private model: string;

  constructor(apiKey?: string, model: string = 'gemini-2.0-flash') {
    this.model = model;
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResponse> {
    if (!this.client) {
      throw new Error('Gemini provider is not configured. Please provide an API key.');
    }

    try {
      const model = this.client.getGenerativeModel({ 
        model: this.model,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens,
          topP: options?.topP,
          topK: options?.topK,
        }
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        text,
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
        }
      };
    } catch (error: any) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  async generateWithSchema<T>(
    prompt: string, 
    schema: z.ZodSchema<T>, 
    options?: GenerateOptions
  ): Promise<T> {
    if (!this.client) {
      throw new Error('Gemini provider is not configured. Please provide an API key.');
    }

    try {
      const model = this.client.getGenerativeModel({ 
        model: this.model,
        generationConfig: {
          temperature: options?.temperature ?? 0.3,
          maxOutputTokens: options?.maxTokens,
          topP: options?.topP,
          topK: options?.topK,
          responseMimeType: "application/json",
        }
      });

      const schemaPrompt = `${prompt}\n\nPlease respond with valid JSON that matches this schema:\n${JSON.stringify(schema._def, null, 2)}`;
      
      const result = await model.generateContent(schemaPrompt);
      const response = await result.response;
      const text = response.text();

      try {
        const parsed = JSON.parse(text);
        return schema.parse(parsed);
      } catch (parseError) {
        throw new Error(`Failed to parse Gemini response as valid JSON: ${parseError}`);
      }
    } catch (error: any) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }
}