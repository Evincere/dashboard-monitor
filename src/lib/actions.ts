// src/lib/actions.ts
'use server';

import { translateNaturalQuery } from '@/ai/flows/translate-natural-query';
import { answerComplexQueries } from '@/ai/flows/answer-complex-queries';
import { generateQuerySuggestions } from '@/ai/flows/generate-query-suggestions';
import { z } from 'zod';

const naturalQuerySchema = z.object({
  question: z.string().min(1, 'La pregunta no puede estar vacía.'),
});

const aiQuerySchema = z.object({
  question: z.string().min(1, 'La consulta no puede estar vacía.'),
});

const tableStats = [
  { table: 'usuarios', rows: '1,254' },
  { table: 'concursos', rows: '48' },
  { table: 'inscripciones', rows: '2,341' },
  { table: 'documentos', rows: '15,829' },
  { table: 'evaluaciones', rows: '782' },
];

export async function handleNaturalQuery(prevState: any, formData: FormData) {
  try {
    const validatedFields = naturalQuerySchema.safeParse({
      question: formData.get('question'),
    });

    if (!validatedFields.success) {
      return {
        error: validatedFields.error.flatten().fieldErrors.question?.join(', '),
        sqlQuery: null,
        answer: null,
      };
    }
    
    // Simulate some latency for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = await translateNaturalQuery({ question: validatedFields.data.question });
    return {
      error: null,
      sqlQuery: result.sqlQuery,
      answer: result.answer,
    };
  } catch (error) {
    console.error('Error in handleNaturalQuery:', error);
    return {
      error: 'Hubo un error al procesar la consulta.',
      sqlQuery: null,
      answer: null,
    };
  }
}

export async function handleAiQuery(prevState: any, formData: FormData) {
  try {
    const validatedFields = aiQuerySchema.safeParse({
      question: formData.get('question'),
    });

    if (!validatedFields.success) {
      return {
        error: validatedFields.error.flatten().fieldErrors.question?.join(', '),
        summary: null,
        quality: null,
        processingTime: null,
      };
    }
    
    // The answerComplexQueries flow includes its own processing logic and latency simulation.
    const result = await answerComplexQueries({
      question: validatedFields.data.question,
    });
    
    const processingTimeInSeconds = (parseInt(result.processingTime, 10) / 1000).toFixed(2);

    return {
      error: null,
      summary: result.answer,
      quality: result.queryQuality,
      processingTime: `${processingTimeInSeconds}s`,
    };

  } catch (error) {
    console.error('Error in handleAiQuery:', error);
    return {
      error: 'Hubo un error al procesar la consulta de IA.',
      summary: null,
      quality: null,
      processingTime: null,
    };
  }
}

export async function handleGenerateSuggestions(prevState: any, formData: FormData) {
    try {
        const schema = tableStats.map(t => t.table).join(', ');
        
        await new Promise(resolve => setTimeout(resolve, 1200));

        const result = await generateQuerySuggestions({ databaseSchema: schema });

        return {
            suggestions: result.suggestions,
            error: null,
        };

    } catch (error) {
        console.error('Error generating suggestions:', error);
        return {
            suggestions: null,
            error: 'No se pudieron generar sugerencias en este momento.',
        };
    }
}
