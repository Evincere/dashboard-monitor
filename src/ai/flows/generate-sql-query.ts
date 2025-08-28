// src/ai/flows/generate-sql-query.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow that translates natural language questions into SQL queries.
 *
 * - generateSqlQuery - A function that translates natural language questions into SQL queries and executes them against the database.
 * - GenerateSqlQueryInput - The input type for the generateSqlQuery function.
 * - GenerateSqlQueryOutput - The return type for the generateSqlQuery function.
 */

import {ai} from '@/ai/unified';
import { executeQuery, getDbSchema } from '@/services/database';
import {z} from 'zod';

const GenerateSqlQueryInputSchema = z.object({
  question: z.string().describe('The natural language question to translate into a SQL query.'),
});
export type GenerateSqlQueryInput = z.infer<typeof GenerateSqlQueryInputSchema>;

const GenerateSqlQueryOutputSchema = z.object({
  sqlQuery: z.string().describe('The generated SQL query.'),
  answer: z.string().describe('The answer from the database, as a JSON string.'),
});
export type GenerateSqlQueryOutput = z.infer<typeof GenerateSqlQueryOutputSchema>;

export async function generateSqlQuery(input: GenerateSqlQueryInput): Promise<GenerateSqlQueryOutput> {
  return generateSqlQueryFlow(input);
}

const generateSqlQueryFlow = ai.defineFlow(
  {
    name: 'generateSqlQueryFlow',
    inputSchema: GenerateSqlQueryInputSchema,
    outputSchema: GenerateSqlQueryOutputSchema,
  },
  async ({ question }) => {
    const dbSchema = await getDbSchema();
    const schemaString = JSON.stringify(dbSchema, null, 2);

    const prompt = `You are a SQL expert. Translate the following natural language question into a SQL query that can be executed against a MySQL database.
Use the following database schema to construct the query. The schema is provided in JSON format.

Database Schema:
${schemaString}

Question: ${question}

SQL Query:`;

    const llmResponse = await ai.generate(prompt, {
        temperature: 0.3
    });

    const sqlQuery = llmResponse.trim().replace(/```sql\n?|```/g, '').replace(/[\r\n]/g, ' ');

    try {
        const results = await executeQuery(sqlQuery);
        return {
            sqlQuery: sqlQuery,
            answer: JSON.stringify(results, null, 2),
        };
    } catch (error: any) {
        console.error('Error executing SQL query:', error);
        return {
            sqlQuery: sqlQuery,
            answer: `Error executing query: ${error.message}`,
        };
    }
  }
);
