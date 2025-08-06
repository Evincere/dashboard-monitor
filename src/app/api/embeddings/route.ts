// src/app/api/embeddings/route.ts

/**
 * @fileOverview API endpoints for embedding operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEmbeddingService } from '@/ai/embeddings';

// Request schemas
const GenerateEmbeddingSchema = z.object({
  text: z.string().min(1).max(10000),
  config: z.object({
    model: z.string().optional(),
    dimensions: z.number().optional(),
  }).optional(),
});

const SearchSimilarSchema = z.object({
  query: z.string().min(1).max(10000),
  topK: z.number().min(1).max(50).default(5),
  minSimilarity: z.number().min(0).max(1).default(0.5),
  includeResponses: z.boolean().default(true),
  type: z.enum(['query', 'response', 'context']).optional(),
});

const StoreQueryResponseSchema = z.object({
  query: z.string().min(1).max(10000),
  response: z.string().min(1).max(50000).optional(),
  metadata: z.object({
    userId: z.string().optional(),
    sessionId: z.string().optional(),
    source: z.string().optional(),
  }).optional(),
});

const StoreContextSchema = z.object({
  text: z.string().min(1).max(50000),
  metadata: z.object({
    source: z.string(),
    type: z.string().optional(),
    category: z.string().optional(),
  }),
});

/**
 * POST /api/embeddings - Handle various embedding operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    const service = await getEmbeddingService();

    switch (action) {
      case 'generate': {
        const { text, config } = GenerateEmbeddingSchema.parse(data);
        
        const transformer = await import('@/ai/embeddings').then(m => m.getSentenceTransformer(config));
        const result = await transformer.encode(text);
        
        return NextResponse.json({
          success: true,
          data: {
            embedding: result.embedding,
            dimensions: result.dimensions,
            model: result.model,
            processingTime: result.processingTime,
          },
        });
      }

      case 'search': {
        const { query, topK, minSimilarity, includeResponses, type } = SearchSimilarSchema.parse(data);
        
        const results = await service.findSimilarQueries(query, {
          topK,
          minSimilarity,
          includeResponses,
        });
        
        return NextResponse.json({
          success: true,
          data: {
            results,
            count: results.length,
            query: query.substring(0, 100),
          },
        });
      }

      case 'store-query': {
        const { query, response, metadata } = StoreQueryResponseSchema.parse(data);
        
        const result = await service.storeQueryResponse({
          query,
          response,
          metadata,
        });
        
        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      case 'store-context': {
        const { text, metadata } = StoreContextSchema.parse(data);
        
        const contextId = await service.storeContext(text, metadata);
        
        return NextResponse.json({
          success: true,
          data: { id: contextId },
        });
      }

      case 'find-context': {
        const { query, topK, minSimilarity } = SearchSimilarSchema.parse(data);
        
        const context = await service.findRelevantContext(query, {
          topK,
          minSimilarity,
        });
        
        return NextResponse.json({
          success: true,
          data: {
            context,
            count: context.length,
          },
        });
      }

      case 'stats': {
        const stats = await service.getMemoryStats();
        
        return NextResponse.json({
          success: true,
          data: stats,
        });
      }

      case 'cleanup': {
        const { maxAge, maxEntries, keepImportantQueries } = z.object({
          maxAge: z.number().optional(),
          maxEntries: z.number().optional(),
          keepImportantQueries: z.boolean().default(true),
        }).parse(data);
        
        const deletedCount = await service.cleanupMemory({
          maxAge,
          maxEntries,
          keepImportantQueries,
        });
        
        return NextResponse.json({
          success: true,
          data: { deletedCount },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Embeddings API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/embeddings - Get embedding service status and stats
 */
export async function GET() {
  try {
    const service = await getEmbeddingService();
    const stats = await service.getMemoryStats();
    
    return NextResponse.json({
      success: true,
      data: {
        status: 'active',
        ...stats,
      },
    });
  } catch (error) {
    console.error('Embeddings status error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Service unavailable',
      },
      { status: 500 }
    );
  }
}