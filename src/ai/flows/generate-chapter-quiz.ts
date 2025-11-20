'use server';

/**
 * @fileOverview An AI agent for generating chapter quizzes based on chapter content.
 *
 * - generateChapterQuiz - A function that handles the quiz generation process.
 * - GenerateChapterQuizInput - The input type for the generateChapterQuiz function.
 * - GenerateChapterQuizOutput - The return type for the generateChapterQuiz function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateChapterQuizInputSchema = z.object({
  chapterContent: z
    .string()
    .describe('The content of the chapter for which to generate the quiz.'),
  topic: z.string().describe('The topic of the chapter.'),
});
export type GenerateChapterQuizInput = z.infer<typeof GenerateChapterQuizInputSchema>;

const GenerateChapterQuizOutputSchema = z.object({
  quiz: z
    .string()
    .describe('The generated quiz for the chapter, formatted as a string.'),
});
export type GenerateChapterQuizOutput = z.infer<typeof GenerateChapterQuizOutputSchema>;

export async function generateChapterQuiz(input: GenerateChapterQuizInput): Promise<GenerateChapterQuizOutput> {
  return generateChapterQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateChapterQuizPrompt',
  input: {schema: GenerateChapterQuizInputSchema},
  output: {schema: GenerateChapterQuizOutputSchema},
  prompt: `You are an expert educator specializing in creating quizzes for educational chapters.

You will use the chapter content to generate a quiz with multiple-choice questions that assess the student's understanding of the material.

The quiz should cover the key concepts and ideas presented in the chapter content. Focus on comprehension and critical thinking.

Topic: {{{topic}}}

Chapter Content: {{{chapterContent}}}

Quiz:`,
});

const generateChapterQuizFlow = ai.defineFlow(
  {
    name: 'generateChapterQuizFlow',
    inputSchema: GenerateChapterQuizInputSchema,
    outputSchema: GenerateChapterQuizOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
