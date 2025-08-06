// src/ai/embeddings/demo.ts

/**
 * @fileOverview Demo script to test embedding functionality
 */

import { getEmbeddingService } from './service';
import { getSentenceTransformer, SentenceTransformer } from './transformer';

async function runEmbeddingDemo() {
  try {
    console.log('🚀 Starting Embedding System Demo...\n');

    // Test 1: Basic embedding generation
    console.log('📝 Test 1: Generating embeddings for Spanish text');
    const transformer = await getSentenceTransformer();
    
    const spanishTexts = [
      '¿Cuántos usuarios hay registrados en el sistema?',
      '¿Cuáles son los concursos activos actualmente?',
      'Mostrar estadísticas de documentos cargados',
      'Información sobre inscripciones de usuarios',
    ];

    console.log('Generating embeddings...');
    const embeddings = await transformer.encodeBatch(spanishTexts);
    console.log(`✅ Generated ${embeddings.embeddings.length} embeddings`);
    console.log(`📐 Dimensions: ${embeddings.dimensions}`);
    console.log(`⏱️ Processing time: ${embeddings.processingTime}ms\n`);

    // Test 2: Similarity calculation
    console.log('📊 Test 2: Calculating similarities');
    const query = '¿Cuántos usuarios están registrados?';
    const queryEmbedding = await transformer.encode(query);
    
    console.log(`Query: "${query}"`);
    console.log('Similarities with stored texts:');
    
    spanishTexts.forEach((text, index) => {
      const similarity = SentenceTransformer.cosineSimilarity(
        queryEmbedding.embedding,
        embeddings.embeddings[index]
      );
      console.log(`  "${text}" → ${(similarity * 100).toFixed(1)}%`);
    });
    console.log();

    // Test 3: Memory service
    console.log('🧠 Test 3: Testing memory service');
    const embeddingService = await getEmbeddingService();
    
    // Store some query-response pairs
    const queryResponses = [
      {
        query: '¿Cuántos usuarios hay en el sistema?',
        response: 'Actualmente hay 1,234 usuarios registrados en el sistema.',
      },
      {
        query: '¿Cuáles son los concursos activos?',
        response: 'Hay 5 concursos activos: Concurso A, B, C, D y E.',
      },
      {
        query: '¿Cómo puedo ver las estadísticas?',
        response: 'Puedes ver las estadísticas en el panel principal del dashboard.',
      },
    ];

    console.log('Storing query-response pairs...');
    for (const qr of queryResponses) {
      await embeddingService.storeQueryResponse({
        query: qr.query,
        response: qr.response,
        metadata: {
          source: 'demo',
          timestamp: Date.now(),
        },
      });
    }
    console.log('✅ Stored query-response pairs\n');

    // Test 4: Semantic search
    console.log('🔍 Test 4: Semantic search');
    const searchQuery = '¿Cuántos usuarios están registrados?';
    console.log(`Searching for: "${searchQuery}"`);
    
    const similarQueries = await embeddingService.findSimilarQueries(searchQuery, {
      topK: 3,
      minSimilarity: 0.3,
      includeResponses: true,
    });

    console.log('Similar queries found:');
    similarQueries.forEach((result, index) => {
      console.log(`  ${index + 1}. "${result.query}" (${(result.similarity * 100).toFixed(1)}%)`);
      console.log(`     Response: "${result.response}"`);
    });
    console.log();

    // Test 5: Context storage
    console.log('📚 Test 5: Storing context information');
    const contextTexts = [
      {
        text: 'La tabla users contiene información de usuarios con campos: id, name, email, role, status, created_at.',
        metadata: {
          source: 'database-schema',
          type: 'table-description',
          category: 'users',
        },
      },
      {
        text: 'Los concursos pueden tener estados: DRAFT, ACTIVE, CLOSED, CANCELLED.',
        metadata: {
          source: 'business-rules',
          type: 'status-definition',
          category: 'contests',
        },
      },
    ];

    for (const ctx of contextTexts) {
      await embeddingService.storeContext(ctx.text, ctx.metadata);
    }
    console.log('✅ Stored context information\n');

    // Test 6: Context retrieval
    console.log('🎯 Test 6: Finding relevant context');
    const contextQuery = 'información sobre usuarios y su estructura';
    console.log(`Context query: "${contextQuery}"`);
    
    const relevantContext = await embeddingService.findRelevantContext(contextQuery, {
      topK: 2,
      minSimilarity: 0.2,
    });

    console.log('Relevant context found:');
    relevantContext.forEach((result, index) => {
      console.log(`  ${index + 1}. "${result.document.text}" (${(result.similarity * 100).toFixed(1)}%)`);
      console.log(`     Source: ${result.document.metadata.source}`);
    });
    console.log();

    // Test 7: Memory statistics
    console.log('📊 Test 7: Memory statistics');
    const stats = await embeddingService.getMemoryStats();
    console.log('Memory Statistics:');
    console.log(`  Total documents: ${stats.storage.totalDocuments}`);
    console.log(`  Storage size: ${(stats.storage.storageSize / 1024).toFixed(2)} KB`);
    console.log(`  Model: ${stats.model.model}`);
    console.log(`  Dimensions: ${stats.model.dimensions}`);
    console.log(`  Language: ${stats.model.language}`);
    console.log();

    console.log('🎉 Embedding System Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run demo if called directly
if (require.main === module) {
  runEmbeddingDemo();
}

export { runEmbeddingDemo };