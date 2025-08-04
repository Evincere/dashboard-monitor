import { config } from 'dotenv';
config();

import '@/ai/flows/generate-query-suggestions.ts';
import '@/ai/flows/generate-sql-query.ts';
import '@/ai/flows/summarize-query-results.ts';
import '@/ai/flows/translate-natural-query.ts';
import '@/ai/flows/answer-complex-queries.ts';