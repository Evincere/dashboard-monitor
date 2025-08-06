// src/ai/config.ts

/**
 * @fileOverview AI configuration utilities for managing provider settings
 */

import { SupportedProvider } from './providers/types';
import { aiProviderManager } from './providers/manager';

export interface AIConfig {
  defaultProvider: SupportedProvider;
  providers: {
    gemini: {
      enabled: boolean;
      apiKey?: string;
      model: string;
    };
    openai: {
      enabled: boolean;
      apiKey?: string;
      model: string;
    };
    claude: {
      enabled: boolean;
      apiKey?: string;
      model: string;
    };
  };
}

/**
 * Get current AI configuration from environment variables
 */
export function getAIConfig(): AIConfig {
  return {
    defaultProvider: (process.env.AI_PROVIDER as SupportedProvider) || 'gemini',
    providers: {
      gemini: {
        enabled: !!(process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY),
        apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      },
      openai: {
        enabled: !!process.env.OPENAI_API_KEY,
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      },
      claude: {
        enabled: !!(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY),
        apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      },
    },
  };
}

/**
 * Get available (configured) providers
 */
export function getAvailableProviders(): SupportedProvider[] {
  const config = getAIConfig();
  return Object.entries(config.providers)
    .filter(([_, providerConfig]) => providerConfig.enabled)
    .map(([name, _]) => name as SupportedProvider);
}

/**
 * Check if a specific provider is configured
 */
export function isProviderConfigured(provider: SupportedProvider): boolean {
  const config = getAIConfig();
  return config.providers[provider].enabled;
}

/**
 * Get provider status for debugging
 */
export function getProviderStatus() {
  const config = getAIConfig();
  const managerStatus = aiProviderManager.getProviderStatus();
  
  return {
    defaultProvider: config.defaultProvider,
    availableProviders: getAvailableProviders(),
    providerDetails: Object.entries(config.providers).map(([name, providerConfig]) => ({
      name: name as SupportedProvider,
      enabled: providerConfig.enabled,
      configured: managerStatus[name as SupportedProvider]?.configured || false,
      model: providerConfig.model,
      hasApiKey: !!providerConfig.apiKey,
    })),
  };
}

/**
 * Validate AI configuration and provide helpful error messages
 */
export function validateAIConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
  const config = getAIConfig();
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const availableProviders = getAvailableProviders();
  
  if (availableProviders.length === 0) {
    errors.push('No AI providers are configured. Please set at least one API key.');
  }
  
  if (!isProviderConfigured(config.defaultProvider)) {
    if (availableProviders.length > 0) {
      warnings.push(`Default provider '${config.defaultProvider}' is not configured. Will use '${availableProviders[0]}' instead.`);
    } else {
      errors.push(`Default provider '${config.defaultProvider}' is not configured and no other providers are available.`);
    }
  }
  
  // Check for deprecated environment variables
  if (process.env.GOOGLE_GENAI_API_KEY && process.env.GEMINI_API_KEY) {
    warnings.push('Both GOOGLE_GENAI_API_KEY and GEMINI_API_KEY are set. GEMINI_API_KEY will be used.');
  }
  
  if (process.env.ANTHROPIC_API_KEY && process.env.CLAUDE_API_KEY) {
    warnings.push('Both ANTHROPIC_API_KEY and CLAUDE_API_KEY are set. CLAUDE_API_KEY will be used.');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}