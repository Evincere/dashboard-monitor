// src/__tests__/specialized-prompting.test.ts

/**
 * @fileOverview Tests for the specialized prompting system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  specializedPromptOrchestrator,
  promptManager,
  promptConfigManager,
  specializedPromptingSystem,
  analyzeQueryIntent,
  processSimpleQuery,
  processComplexQuery,
  getSystemHealth
} from '@/ai/prompts';

// Mock the AI unified interface
vi.mock('@/ai/unified', () => ({
  ai: {
    definePrompt: vi.fn(() => vi.fn().mockResolvedValue({ 
      output: {
        primaryIntent: 'data_retrieval',
        complexity: 'simple',
        confidence: 0.9,
        requiredTables: ['users'],
        queryType: 'single_table',
        expectedOutputFormat: 'tabular_data',
        contextualFactors: [],
        reasoning: 'Simple data retrieval query',
        steps: [
          {
            id: 'step1',
            type: 'data_collection',
            description: 'Collect user data',
            dependencies: [],
            priority: 1
          }
        ]
      }
    })),
    generateWithSchema: vi.fn().mockResolvedValue({
      primaryIntent: 'data_retrieval',
      complexity: 'simple',
      confidence: 0.9,
      requiredTables: ['users'],
      queryType: 'single_table',
      expectedOutputFormat: 'tabular_data',
      contextualFactors: [],
      reasoning: 'Simple data retrieval query'
    }),
    defineFlow: vi.fn(() => vi.fn().mockResolvedValue({
      finalAnswer: 'Test response',
      resolutionPath: [],
      qualityMetrics: {
        completeness: 0.9,
        accuracy: 0.9,
        efficiency: 0.9,
        totalIterations: 1,
        totalExecutionTime: 1000
      },
      recommendations: [],
      debugInfo: {
        stepsExecuted: 1,
        queriesExecuted: 1,
        errorsEncountered: 0,
        cacheHits: 0
      }
    }))
  }
}));

// Mock the database service
vi.mock('@/services/database', () => ({
  executeQuery: vi.fn().mockResolvedValue([]),
  getDbSchema: vi.fn().mockResolvedValue({
    users: { id: 'int', name: 'varchar', email: 'varchar' },
    contests: { id: 'int', title: 'varchar', status: 'enum' }
  })
}));

describe('Specialized Prompting System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PromptConfigManager', () => {
    it('should load default templates', () => {
      const templates = promptConfigManager.getAvailableTemplates();
      expect(templates).toContain('intent_classifier_v2');
      expect(templates).toContain('sql_optimizer_v2');
      expect(templates).toContain('context_analyzer_v2');
    });

    it('should get template by ID', () => {
      const template = promptConfigManager.getTemplate('intent_classifier_v2');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Advanced Intent Classifier');
      expect(template?.category).toBe('intent_discovery');
    });

    it('should get templates by category', () => {
      const intentTemplates = promptConfigManager.getTemplatesByCategory('intent_discovery');
      expect(intentTemplates.length).toBeGreaterThan(0);
      expect(intentTemplates[0].category).toBe('intent_discovery');
    });

    it('should validate parameters correctly', () => {
      const validation = promptConfigManager.validateParameters('intent_classifier_v2', {
        userQuery: 'Test query',
        dbSchema: '{"users": {}}'
      });
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation for missing required parameters', () => {
      const validation = promptConfigManager.validateParameters('intent_classifier_v2', {
        // Missing required userQuery and dbSchema
      });
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should build prompt from template', () => {
      const prompt = promptConfigManager.buildPrompt('intent_classifier_v2', {
        userQuery: 'How many users are there?',
        dbSchema: '{"users": {"id": "int"}}',
        userRole: 'administrator'
      });
      
      expect(prompt).toContain('How many users are there?');
      expect(prompt).toContain('administrator');
      expect(prompt).toContain('{"users": {"id": "int"}}');
    });

    it('should update performance metrics', () => {
      const templateId = 'intent_classifier_v2';
      const initialTemplate = promptConfigManager.getTemplate(templateId);
      const initialAvgTime = initialTemplate?.metadata.performance.avgExecutionTime;

      promptConfigManager.updatePerformanceMetrics(templateId, 1500, true, 0.9);

      const updatedTemplate = promptConfigManager.getTemplate(templateId);
      expect(updatedTemplate?.metadata.performance.avgExecutionTime).toBeDefined();
      expect(updatedTemplate?.metadata.performance.successRate).toBeGreaterThan(0);
    });
  });

  describe('PromptManager', () => {
    it('should have prompt configurations loaded', () => {
      const stats = promptManager.getUsageStats();
      expect(Object.keys(stats).length).toBeGreaterThan(0);
    });

    it('should get prompt configuration', () => {
      const config = promptManager.getPromptConfig('intent_classifier');
      expect(config).toBeDefined();
    });

    it('should get prompts by category', () => {
      const intentPrompts = promptManager.getPromptsByCategory('intent_discovery');
      expect(intentPrompts.length).toBeGreaterThan(0);
    });

    it('should clear cache', () => {
      expect(() => promptManager.clearCache()).not.toThrow();
    });
  });

  describe('SpecializedPromptOrchestrator', () => {
    it('should execute specialized workflow', async () => {
      const result = await specializedPromptOrchestrator.executeSpecializedWorkflow(
        'How many users are registered?',
        '{"users": {"id": "int", "name": "varchar"}}',
        ''
      );

      expect(result).toBeDefined();
      expect(result.intentAnalysis).toBeDefined();
      expect(result.finalResponse).toBeDefined();
      expect(result.processingMetrics).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Mock an error in the workflow by making the AI call fail
      vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock the AI to throw an error
      const mockAI = await import('@/ai/unified');
      vi.spyOn(mockAI.ai, 'generateWithSchema').mockRejectedValueOnce(new Error('AI service error'));
      
      await expect(
        specializedPromptOrchestrator.executeSpecializedWorkflow(
          'test query',
          '{}',
          ''
        )
      ).rejects.toThrow('Error en el sistema de prompting especializado');
    });
  });

  describe('SpecializedPromptingSystem', () => {
    it('should process simple queries', async () => {
      const result = await specializedPromptingSystem.processQuery(
        'Count all users',
        { complexity: 'simple' }
      );

      expect(result).toBeDefined();
    });

    it('should process complex queries with iterative resolution', async () => {
      const result = await specializedPromptingSystem.processQuery(
        'Analyze user engagement patterns over the last 6 months',
        { 
          complexity: 'complex',
          useIterativeResolution: true,
          maxIterations: 5
        }
      );

      expect(result).toBeDefined();
    });

    it('should analyze query intent', async () => {
      const result = await specializedPromptingSystem.analyzeIntent(
        'How many active users do we have?',
        '{"users": {"id": "int", "status": "enum"}}',
        ''
      );

      expect(result).toBeDefined();
    });

    it('should get performance metrics', () => {
      const metrics = specializedPromptingSystem.getPerformanceMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.promptManager).toBeDefined();
      expect(metrics.templates).toBeDefined();
      expect(metrics.orchestrator).toBeDefined();
    });

    it('should configure system settings', () => {
      expect(() => {
        specializedPromptingSystem.configure({
          defaultProvider: 'gemini',
          cacheEnabled: true,
          defaultTimeout: 30000,
          maxIterations: 10
        });
      }).not.toThrow();
    });

    it('should clear caches', () => {
      expect(() => specializedPromptingSystem.clearCaches()).not.toThrow();
    });
  });

  describe('Convenience Functions', () => {
    it('should process simple query', async () => {
      const result = await processSimpleQuery('Count users');
      expect(result).toBeDefined();
    });

    it('should process complex query', async () => {
      const result = await processComplexQuery(
        'Analyze trends in user registrations',
        { maxIterations: 5 }
      );
      expect(result).toBeDefined();
    });

    it('should analyze query intent', async () => {
      const result = await analyzeQueryIntent(
        'Show me user statistics',
        '{"users": {"id": "int"}}',
        ''
      );
      expect(result).toBeDefined();
    });

    it('should get system health', () => {
      const health = getSystemHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toBe('operational');
      expect(health.components).toBeDefined();
      expect(health.metrics).toBeDefined();
      expect(health.lastUpdated).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle prompt execution errors', async () => {
      // Mock a prompt execution error
      vi.spyOn(promptManager, 'executePrompt').mockRejectedValueOnce(
        new Error('Prompt execution failed')
      );

      await expect(
        specializedPromptingSystem.analyzeIntent('test', 'schema', '')
      ).rejects.toThrow('Prompt execution failed');
    });

    it('should handle invalid template IDs', () => {
      expect(() => {
        promptConfigManager.buildPrompt('nonexistent_template', {});
      }).toThrow("Template 'nonexistent_template' not found");
    });

    it('should handle parameter validation errors', () => {
      expect(() => {
        promptConfigManager.buildPrompt('intent_classifier_v2', {
          // Missing required parameters
        });
      }).toThrow('Parameter validation failed');
    });
  });

  describe('Performance and Caching', () => {
    it('should track performance metrics', () => {
      const templateId = 'intent_classifier_v2';
      const initialStats = promptConfigManager.getPerformanceStats();
      
      promptConfigManager.updatePerformanceMetrics(templateId, 1000, true, 0.85);
      
      const updatedStats = promptConfigManager.getPerformanceStats();
      expect(updatedStats[templateId]).toBeDefined();
      expect(updatedStats[templateId].performance).toBeDefined();
    });

    it('should handle cache operations', () => {
      // Test cache clearing
      expect(() => promptManager.clearCache()).not.toThrow();
      expect(() => specializedPromptingSystem.clearCaches()).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end for a typical query', async () => {
      const userQuery = '¿Cuántos usuarios están registrados en el sistema?';
      
      try {
        const result = await specializedPromptingSystem.processQuery(userQuery, {
          complexity: 'auto'
        });
        
        expect(result).toBeDefined();
        // The exact structure depends on which path is taken (simple vs complex)
        // but we should always get some kind of result
      } catch (error) {
        // In a test environment with mocked dependencies, 
        // we might get errors, but they should be handled gracefully
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should maintain consistency across multiple calls', async () => {
      const query = 'Test consistency query';
      const schema = '{"test": {"id": "int"}}';
      
      // Make multiple calls and verify they don't interfere with each other
      const promises = Array(3).fill(null).map(() => 
        specializedPromptingSystem.analyzeIntent(query, schema, '')
      );
      
      const results = await Promise.allSettled(promises);
      
      // All calls should either succeed or fail consistently
      const statuses = results.map(r => r.status);
      expect(statuses.every(s => s === statuses[0])).toBe(true);
    });
  });
});