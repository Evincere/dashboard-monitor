'use server';

/**
 * @fileOverview Summarizes query results into a human-readable format.
 *
 * - summarizeQueryResults - A function that summarizes query results.
 * - SummarizeQueryResultsInput - The input type for the summarizeQueryResults function.
 * - SummarizeQueryResultsOutput - The return type for the summarizeQueryResults function.
 */

import {ai} from '@/ai/unified';
import {z} from 'genkit';

const SummarizeQueryResultsInputSchema = z.object({
  query: z.string().describe('The original query in natural language.'),
  results: z.string().describe('The query results from the database.'),
});
export type SummarizeQueryResultsInput = z.infer<typeof SummarizeQueryResultsInputSchema>;

const SummarizeQueryResultsOutputSchema = z.object({
  summary: z.string().describe('A human-readable summary of the query results.'),
});
export type SummarizeQueryResultsOutput = z.infer<typeof SummarizeQueryResultsOutputSchema>;

export async function summarizeQueryResults(input: SummarizeQueryResultsInput): Promise<SummarizeQueryResultsOutput> {
  return summarizeQueryResultsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeQueryResultsPrompt',
  input: {schema: SummarizeQueryResultsInputSchema},
  output: {schema: SummarizeQueryResultsOutputSchema},
  prompt: `You are an expert at summarizing data for humans.
  Given a query and the results from a database, create a human-readable summary of the results.

  Query: {{{query}}}
  Results: {{{results}}}

  Summary:`,
  config: { temperature: 0.5 }
});

const summarizeQueryResultsFlow = ai.defineFlow(
  {
    name: 'summarizeQueryResultsFlow',
    inputSchema: SummarizeQueryResultsInputSchema,
    outputSchema: SummarizeQueryResultsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
