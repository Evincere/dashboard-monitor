// src/ai/flows/translate-natural-query.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow that translates natural language questions in Spanish into SQL queries, executes them against the database, and returns a humanized response.
 *
 * - translateNaturalQuery - A function that translates natural language questions into SQL queries and executes them against the database.
 * - TranslateNaturalQueryInput - The input type for the translateNaturalQuery function.
 * - TranslateNaturalQueryOutput - The return type for the translateNaturalQuery function.
 */

import {ai} from '@/ai/genkit';
import { executeQuery, getDbSchema } from '@/services/database';
import {z} from 'genkit';
import { summarizeQueryResults } from './summarize-query-results';

const TranslateNaturalQueryInputSchema = z.object({
  question: z.string().describe('The natural language question in Spanish to translate into a SQL query.'),
});
export type TranslateNaturalQueryInput = z.infer<typeof TranslateNaturalQueryInputSchema>;

const TranslateNaturalQueryOutputSchema = z.object({
  sqlQuery: z.string().describe('The generated SQL query.'),
  answer: z.string().describe('The humanized answer from the database.'),
});
export type TranslateNaturalQueryOutput = z.infer<typeof TranslateNaturalQueryOutputSchema>;

export async function translateNaturalQuery(input: TranslateNaturalQueryInput): Promise<TranslateNaturalQueryOutput> {
  return translateNaturalQueryFlow(input);
}

const translateNaturalQueryFlow = ai.defineFlow(
  {
    name: 'translateNaturalQueryFlow',
    inputSchema: TranslateNaturalQueryInputSchema,
    outputSchema: TranslateNaturalQueryOutputSchema,
  },
  async ({ question }) => {
    const dbSchema = await getDbSchema();
    const schemaString = JSON.stringify(dbSchema, null, 2);

    const sqlGenPrompt = ai.definePrompt({
        name: 'translateNaturalQueryPrompt',
        input: { schema: z.object({ question: z.string(), schema: z.string() }) },
        output: { schema: z.object({ sqlQuery: z.string() }) },
        prompt: `Eres un experto en SQL. Traduce la siguiente pregunta en lenguaje natural al español a una consulta SQL que se pueda ejecutar en una base de datos MySQL.
Utiliza el siguiente esquema de base de datos para construir la consulta. El esquema se proporciona en formato JSON.

Esquema de la Base de Datos:
{{{schema}}}

Pregunta: {{{question}}}

Consulta SQL:`
    });

    const { output } = await sqlGenPrompt({ question, schema: schemaString });
    const sqlQuery = output?.sqlQuery ?? '';

    if (!sqlQuery) {
        return {
            sqlQuery: '',
            answer: 'No se pudo generar una consulta SQL para esa pregunta.',
        }
    }

    try {
        const results = await executeQuery(sqlQuery);
        const resultsString = JSON.stringify(results, null, 2);

        if (Array.isArray(results) && results.length === 0) {
            return {
                sqlQuery,
                answer: "La consulta no devolvió resultados."
            }
        }

        const summary = await summarizeQueryResults({
            query: question,
            results: resultsString,
        });

        return {
            sqlQuery: sqlQuery,
            answer: summary.summary,
        };
    } catch (error: any) {
        console.error("Error executing natural query flow:", error);
        return {
            sqlQuery,
            answer: `Hubo un error al ejecutar la consulta: ${error.message}`
        }
    }
  }
);
