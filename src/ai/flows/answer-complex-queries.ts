// src/ai/flows/answer-complex-queries.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow that answers complex, open-ended questions about the MPD contest system.
 *
 * - answerComplexQueries - A function that answers complex questions by decomposing them into sub-queries, executing them, and synthesizing a response.
 * - AnswerComplexQueriesInput - The input type for the answerComplexQueries function.
 * - AnswerComplexQueriesOutput - The return type for the answerComplexQueries function.
 */

import {ai} from '@/ai/unified';
import { executeQuery, getDbSchema } from '@/services/database';
import {z} from 'genkit';
import { summarizeQueryResults } from './summarize-query-results';

const AnswerComplexQueriesInputSchema = z.object({
  question: z.string().describe('The complex, open-ended question about the MPD contest system.'),
});
export type AnswerComplexQueriesInput = z.infer<typeof AnswerComplexQueriesInputSchema>;

const AnswerComplexQueriesOutputSchema = z.object({
  answer: z.string().describe('The detailed, synthesized response to the complex question.'),
  queryQuality: z.string().describe('Metrics of quality'),
  processingTime: z.string().describe('Processing time'),
});
export type AnswerComplexQueriesOutput = z.infer<typeof AnswerComplexQueriesOutputSchema>;

export async function answerComplexQueries(input: AnswerComplexQueriesInput): Promise<AnswerComplexQueriesOutput> {
  return answerComplexQueriesFlow(input);
}


const answerComplexQueriesFlow = ai.defineFlow(
  {
    name: 'answerComplexQueriesFlow',
    inputSchema: AnswerComplexQueriesInputSchema,
    outputSchema: AnswerComplexQueriesOutputSchema,
  },
  async ({ question }) => {
    const startTime = Date.now();
    const dbSchema = await getDbSchema();
    const schemaString = JSON.stringify(dbSchema, null, 2);

    const plannerPrompt = ai.definePrompt({
        name: 'complexQueryPlannerPrompt',
        input: { schema: z.object({ question: z.string(), schema: z.string() }) },
        output: { schema: z.object({ 
            plan: z.string().describe("A step-by-step plan to answer the question."),
            subQueries: z.array(z.object({
                id: z.string().describe("A unique identifier for the sub-query (e.g., 'q1')."),
                query: z.string().describe("A specific SQL query to execute."),
                dependency: z.string().optional().describe("The ID of a sub-query this query depends on (e.g., 'q1')."),
                description: z.string().describe("A description of what this query is trying to achieve."),
            })),
        }) },
        prompt: `You are an expert AI assistant that answers complex, open-ended questions about a database.
Your task is to decompose a complex user question into a series of smaller, executable SQL sub-queries.
You will be given the database schema to help you construct the queries.

Your plan should outline how you will use the results of these sub-queries to construct a final, synthesized answer.

Database Schema:
{{{schema}}}

User Question:
{{{question}}}
`,
        config: { temperature: 0.1 }
    });

    const { output: planOutput } = await plannerPrompt({ question, schema: schemaString });
    
    if (!planOutput || planOutput.subQueries.length === 0) {
        return {
            answer: 'I was unable to create a plan to answer your question. Please try rephrasing it.',
            queryQuality: 'Low',
            processingTime: `${Date.now() - startTime}`
        }
    }

    const queryResults: Record<string, any> = {};

    for (const subQuery of planOutput.subQueries) {
        // Simple dependency handling - can be improved for parallel execution
        let currentQuery = subQuery.query;
        if (subQuery.dependency && queryResults[subQuery.dependency]) {
            // Basic replacement, could be more sophisticated
            const dependentResult = queryResults[subQuery.dependency];
            if(Array.isArray(dependentResult) && dependentResult.length > 0) {
                const ids = dependentResult.map(r => typeof r.id === 'number' ? r.id : `'${r.id}'`).join(',');
                currentQuery = currentQuery.replace(`'{{{${subQuery.dependency}.ids}}}'`, `(${ids})`);
            }
        }
        
        try {
            queryResults[subQuery.id] = await executeQuery(currentQuery);
        } catch (e: any) {
            queryResults[subQuery.id] = { error: e.message };
        }
    }

    const synthesizerPrompt = ai.definePrompt({
        name: 'complexQuerySynthesizerPrompt',
        input: { schema: z.object({ 
            question: z.string(), 
            plan: z.string(), 
            results: z.string() 
        }) },
        output: { schema: z.object({ finalAnswer: z.string() }) },
        prompt: `You are an AI assistant. Your goal is to synthesize a final, human-readable answer to a user's question based on a plan and the results of several SQL queries.

User's Original Question:
{{{question}}}

Your Execution Plan:
{{{plan}}}

Query Results (in JSON format):
{{{results}}}

---
Based on the plan and the data from the query results, provide a comprehensive, well-structured, and easy-to-understand answer to the user's original question. Do not just repeat the data; interpret it and present the key insights.
Final Answer:`,
        config: { temperature: 0.7 }
    });

    const { output: finalOutput } = await synthesizerPrompt({
        question,
        plan: planOutput.plan,
        results: JSON.stringify(queryResults, null, 2),
    });

    const endTime = Date.now();
    const processingTime = (endTime - startTime).toString();
    
    return {
      answer: finalOutput?.finalAnswer ?? 'No se pudo sintetizar una respuesta final.',
      queryQuality: 'High',
      processingTime: processingTime,
    };
  }
);
