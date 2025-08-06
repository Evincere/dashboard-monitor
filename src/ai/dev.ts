import { config } from 'dotenv';
config();

// Import AI flows
import '@/ai/flows/generate-query-suggestions.ts';
import '@/ai/flows/generate-sql-query.ts';
import '@/ai/flows/summarize-query-results.ts';
import '@/ai/flows/translate-natural-query.ts';
import '@/ai/flows/answer-complex-queries.ts';
import '@/ai/flows/intelligent-query-router.ts';

// Initialize AI providers
import { validateAIConfig } from '@/ai/config';

// Validate configuration on startup
const validation = validateAIConfig();
if (!validation.valid) {
  console.error('❌ AI Configuration Errors:');
  validation.errors.forEach(error => console.error(`  - ${error}`));
}

if (validation.warnings.length > 0) {
  console.warn('⚠️  AI Configuration Warnings:');
  validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
}

if (validation.valid) {
  console.log('✅ AI providers configured successfully');
}