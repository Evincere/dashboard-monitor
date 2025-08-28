'use server';

/**
 * @fileOverview A flow for generating query suggestions based on the database schema.
 *
 * - generateQuerySuggestions - A function that generates query suggestions.
 * - GenerateQuerySuggestionsInput - The input type for the generateQuerySuggestions function.
 * - GenerateQuerySuggestionsOutput - The return type for the generateQuerySuggestions function.
 */

import {ai} from '@/ai/unified';
import {z} from 'zod';

const GenerateQuerySuggestionsInputSchema = z.object({
  databaseSchema: z.string().describe('The schema of the database.'),
});
export type GenerateQuerySuggestionsInput = z.infer<typeof GenerateQuerySuggestionsInputSchema>;

const GenerateQuerySuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('An array of suggested queries.'),
});
export type GenerateQuerySuggestionsOutput = z.infer<typeof GenerateQuerySuggestionsOutputSchema>;

export async function generateQuerySuggestions(input: GenerateQuerySuggestionsInput): Promise<GenerateQuerySuggestionsOutput> {
  return generateQuerySuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuerySuggestionsPrompt',
  input: {schema: GenerateQuerySuggestionsInputSchema},
  output: {schema: GenerateQuerySuggestionsOutputSchema},
  prompt: `You are an AI assistant that suggests queries based on a given database schema.

  Given the following database schema:
  {{{databaseSchema}}}

  Suggest a few example queries that would be useful to explore the data. The queries should be in Spanish.
  Queries:
  `,
  config: { temperature: 0.7 }
});

const generateQuerySuggestionsFlow = ai.defineFlow(
  {
    name: 'generateQuerySuggestionsFlow',
    inputSchema: GenerateQuerySuggestionsInputSchema,
    outputSchema: GenerateQuerySuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
