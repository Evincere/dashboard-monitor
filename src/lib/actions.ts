// src/lib/actions.ts
'use server';

import { translateNaturalQuery } from '@/ai/flows/translate-natural-query';
import { answerComplexQueries } from '@/ai/flows/answer-complex-queries';
import { intelligentQueryRouter } from '@/ai/flows/intelligent-query-router';
import { generateQuerySuggestions } from '@/ai/flows/generate-query-suggestions';
import { getDbSchema } from '@/services/database';
import { z } from 'zod';

const naturalQuerySchema = z.object({
  question: z.string().min(1, 'La pregunta no puede estar vacía.'),
});

const aiQuerySchema = z.object({
  question: z.string().min(1, 'La consulta no puede estar vacía.'),
});

const unifiedQuerySchema = z.object({
  question: z.string().min(1, 'La pregunta no puede estar vacía.'),
});

export type NaturalQueryState = {
  sqlQuery: string | null;
  answer: string | null;
  error: string | undefined;
};

export async function handleNaturalQuery(_: NaturalQueryState, formData: FormData): Promise<NaturalQueryState> {
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

    const result = await translateNaturalQuery({ question: validatedFields.data.question });
    return {
      error: undefined,
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

export async function handleUnifiedQuery(prevState: any, formData: FormData) {
  try {
    const validatedFields = unifiedQuerySchema.safeParse({
      question: formData.get('question'),
    });

    if (!validatedFields.success) {
      return {
        error: validatedFields.error.flatten().fieldErrors.question?.join(', '),
        answer: null,
        queryType: null,
        sqlQueries: null,
        processingTime: null,
        queryQuality: null,
      };
    }

    const result = await intelligentQueryRouter({
      question: validatedFields.data.question
    });

    const processingTimeInSeconds = (parseInt(result.processingTime, 10) / 1000).toFixed(2);

    return {
      error: null,
      answer: result.answer,
      queryType: result.queryType,
      sqlQueries: result.sqlQueries,
      processingTime: `${processingTimeInSeconds}s`,
      queryQuality: result.queryQuality,
    };

  } catch (error) {
    console.error('Error in handleUnifiedQuery:', error);
    return {
      error: 'Hubo un error al procesar la consulta.',
      answer: null,
      queryType: null,
      sqlQueries: null,
      processingTime: null,
      queryQuality: null,
    };
  }
}

export type ActionState =
  | { suggestions: string[]; error: null }
  | { suggestions: null; error: string }
  | { suggestions: null; error: null; loading?: boolean };

export async function handleGenerateSuggestions(formData: FormData): Promise<ActionState> {
  try {
    const schema = await getDbSchema();
    const schemaString = JSON.stringify(schema, null, 2);

    const result = await generateQuerySuggestions({ databaseSchema: schemaString });

    if (!result?.suggestions?.length) {
      return {
        suggestions: null,
        error: 'No se generaron sugerencias.',
      };
    }

    return {
      suggestions: result.suggestions,
      error: null,
    };

  } catch (error) {
    console.error('Error generating suggestions:', error);
    return {
      suggestions: null,
      error: error instanceof Error ? error.message : 'No se pudieron generar sugerencias en este momento.',
    };
  }
}
