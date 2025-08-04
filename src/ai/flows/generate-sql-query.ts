// src/ai/flows/generate-sql-query.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow that translates natural language questions into SQL queries.
 *
 * - generateSqlQuery - A function that translates natural language questions into SQL queries and executes them against the database.
 * - GenerateSqlQueryInput - The input type for the generateSqlQuery function.
 * - GenerateSqlQueryOutput - The return type for the generateSqlQuery function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSqlQueryInputSchema = z.object({
  question: z.string().describe('The natural language question to translate into a SQL query.'),
});
export type GenerateSqlQueryInput = z.infer<typeof GenerateSqlQueryInputSchema>;

const GenerateSqlQueryOutputSchema = z.object({
  sqlQuery: z.string().describe('The generated SQL query.'),
  answer: z.string().describe('The answer from the database.'),
});
export type GenerateSqlQueryOutput = z.infer<typeof GenerateSqlQueryOutputSchema>;

export async function generateSqlQuery(input: GenerateSqlQueryInput): Promise<GenerateSqlQueryOutput> {
  return generateSqlQueryFlow(input);
}

const generateSqlQueryPrompt = ai.definePrompt({
  name: 'generateSqlQueryPrompt',
  input: {schema: GenerateSqlQueryInputSchema},
  output: {schema: GenerateSqlQueryOutputSchema},
  prompt: `You are a SQL expert. Translate the following natural language question into a SQL query that can be executed against a MySQL database.

Question: {{{question}}}

SQL Query:`, // DO NOT include the answer here, that is obtained by running this query.
});

const generateSqlQueryFlow = ai.defineFlow(
  {
    name: 'generateSqlQueryFlow',
    inputSchema: GenerateSqlQueryInputSchema,
    outputSchema: GenerateSqlQueryOutputSchema,
  },
  async input => {
    const {output} = await generateSqlQueryPrompt(input);
    // Here, you would execute the SQL query against the database
    // and then return the result in the answer field.
    // For now, we'll just return a placeholder.
    return {
      sqlQuery: output?.sqlQuery ?? 'SELECT * FROM users;',
      answer: 'This is a placeholder answer from the database.',
    };
  }
);
