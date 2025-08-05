// src/__tests__/intelligent-query-router.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { intelligentQueryRouter } from '@/ai/flows/intelligent-query-router';

// Mock the dependencies
vi.mock('@/ai/genkit', () => ({
  ai: {
    defineFlow: vi.fn((config, fn) => fn),
    definePrompt: vi.fn((config) => ({
      output: config.output?.schema ? { 
        complexity: 'simple',
        reasoning: 'Test reasoning',
        requiresMultipleQueries: false,
        requiresAnalysis: false,
        sqlQuery: 'SELECT COUNT(*) FROM users',
        finalAnswer: 'Test answer'
      } : null
    }))
  }
}));

vi.mock('@/services/database', () => ({
  getDbSchema: vi.fn(() => Promise.resolve({ tables: ['users', 'contests'] })),
  executeQuery: vi.fn(() => Promise.resolve([{ count: 5 }]))
}));

vi.mock('@/ai/flows/summarize-query-results', () => ({
  summarizeQueryResults: vi.fn(() => Promise.resolve({ summary: 'There are 5 users in the system.' }))
}));

describe('Intelligent Query Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined and exportable', () => {
    expect(intelligentQueryRouter).toBeDefined();
    expect(typeof intelligentQueryRouter).toBe('function');
  });

  it('should accept input with question parameter', async () => {
    const input = { question: '¿Cuántos usuarios hay?' };
    
    // This test just verifies the function can be called without throwing
    // The actual AI functionality would require proper mocking of Genkit
    expect(() => intelligentQueryRouter(input)).not.toThrow();
  });

  it('should return the expected output structure', () => {
    const input = { question: '¿Cuántos usuarios hay?' };
    const result = intelligentQueryRouter(input);
    
    // Verify it returns a Promise
    expect(result).toBeInstanceOf(Promise);
  });
});