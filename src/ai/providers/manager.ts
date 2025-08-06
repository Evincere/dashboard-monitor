// src/ai/providers/manager.ts

/**
 * @fileOverview AI Provider Manager - manages multiple AI providers and provides unified access
 */

import { AIProvider, AIProviderManager, SupportedProvider } from './types';
import { GeminiProvider } from './gemini';
import { OpenAIProvider } from './openai';
import { ClaudeProvider } from './claude';

export class AIProviderManagerImpl implements AIProviderManager {
  private providers: Map<SupportedProvider, AIProvider> = new Map();
  private defaultProvider: SupportedProvider = 'gemini';

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize Gemini provider
    const geminiApiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    this.providers.set('gemini', new GeminiProvider(geminiApiKey, geminiModel));

    // Initialize OpenAI provider
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.providers.set('openai', new OpenAIProvider(openaiApiKey, openaiModel));

    // Initialize Claude provider
    const claudeApiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    const claudeModel = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
    this.providers.set('claude', new ClaudeProvider(claudeApiKey, claudeModel));

    // Set default provider based on environment or first available
    const preferredProvider = process.env.AI_PROVIDER as SupportedProvider;
    if (preferredProvider && this.providers.has(preferredProvider)) {
      this.defaultProvider = preferredProvider;
    } else {
      // Find first configured provider
      for (const [name, provider] of this.providers.entries()) {
        if (provider.isConfigured()) {
          this.defaultProvider = name;
          break;
        }
      }
    }
  }

  getProvider(name?: SupportedProvider): AIProvider {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      throw new Error(`AI provider '${providerName}' not found`);
    }

    if (!provider.isConfigured()) {
      throw new Error(`AI provider '${providerName}' is not configured. Please provide the required API key.`);
    }

    return provider;
  }

  getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.values()).filter(provider => provider.isConfigured());
  }

  setDefaultProvider(name: SupportedProvider): void {
    if (!this.providers.has(name)) {
      throw new Error(`AI provider '${name}' not found`);
    }
    this.defaultProvider = name;
  }

  getDefaultProvider(): AIProvider {
    return this.getProvider();
  }

  /**
   * Get provider status for debugging/monitoring
   */
  getProviderStatus(): Record<SupportedProvider, { configured: boolean; name: string }> {
    const status: Record<SupportedProvider, { configured: boolean; name: string }> = {} as any;
    
    for (const [name, provider] of this.providers.entries()) {
      status[name] = {
        configured: provider.isConfigured(),
        name: provider.name
      };
    }
    
    return status;
  }

  /**
   * Get the name of the current default provider
   */
  getDefaultProviderName(): SupportedProvider {
    return this.defaultProvider;
  }
}

// Singleton instance
export const aiProviderManager = new AIProviderManagerImpl();