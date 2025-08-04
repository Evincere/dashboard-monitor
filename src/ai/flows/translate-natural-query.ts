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
import {z} from 'genkit';

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

const translateNaturalQueryPrompt = ai.definePrompt({
  name: 'translateNaturalQueryPrompt',
  input: {schema: TranslateNaturalQueryInputSchema},
  output: {schema: TranslateNaturalQueryOutputSchema},
  prompt: `Eres un experto en SQL. Traduce la siguiente pregunta en lenguaje natural al español a una consulta SQL que se pueda ejecutar en una base de datos MySQL.\
\
Pregunta: {{{question}}}
\
Consulta SQL:`,
});

const translateNaturalQueryFlow = ai.defineFlow(
  {
    name: 'translateNaturalQueryFlow',
    inputSchema: TranslateNaturalQueryInputSchema,
    outputSchema: TranslateNaturalQueryOutputSchema,
  },
  async input => {
    const {output} = await translateNaturalQueryPrompt(input);
    // Here, you would execute the SQL query against the database
    // and then return the result in the answer field.
    // For now, we'll just return a placeholder.
    return {
      sqlQuery: output?.sqlQuery ?? 'SELECT * FROM users;',
      answer: 'Esta es una respuesta de marcador de posición de la base de datos.',
    };
  }
);
