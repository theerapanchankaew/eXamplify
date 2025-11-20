'use server';

/**
 * @fileOverview AI flow for generating lesson summaries from source content.
 *
 * - generateLessonSummary - A function that generates lesson summaries.
 * - GenerateLessonSummaryInput - The input type for the generateLessonSummary function.
 * - GenerateLessonSummaryOutput - The return type for the generateLessonSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateLessonSummaryInputSchema = z.object({
  sourceContent: z
    .string()
    .describe('The source content of the lesson to be summarized.'),
});
export type GenerateLessonSummaryInput = z.infer<typeof GenerateLessonSummaryInputSchema>;

const GenerateLessonSummaryOutputSchema = z.object({
  summary: z.string().describe('The generated summary of the lesson content.'),
  progress: z.string().describe('Progress of the AI during content generation'),
});
export type GenerateLessonSummaryOutput = z.infer<typeof GenerateLessonSummaryOutputSchema>;

export async function generateLessonSummary(
  input: GenerateLessonSummaryInput
): Promise<GenerateLessonSummaryOutput> {
  return generateLessonSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLessonSummaryPrompt',
  input: {schema: GenerateLessonSummaryInputSchema},
  output: {schema: GenerateLessonSummaryOutputSchema},
  prompt: `You are an expert educator. Please provide a concise and informative summary of the following lesson content:

  {{sourceContent}}

  Focus on the key concepts and takeaways that students should remember. Keep the summary short and actionable.
  Also add a progress field to the output.`,
});

const generateLessonSummaryFlow = ai.defineFlow(
  {
    name: 'generateLessonSummaryFlow',
    inputSchema: GenerateLessonSummaryInputSchema,
    outputSchema: GenerateLessonSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    output!.progress = 'Generated a short summary of the source content.';
    return output!;
  }
);
