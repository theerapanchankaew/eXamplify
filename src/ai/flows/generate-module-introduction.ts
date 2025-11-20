'use server';

/**
 * @fileOverview AI flow to generate a module introduction from module content.
 *
 * - generateModuleIntroduction - A function that generates a module introduction.
 * - GenerateModuleIntroductionInput - The input type for the generateModuleIntroduction function.
 * - GenerateModuleIntroductionOutput - The return type for the generateModuleIntroduction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateModuleIntroductionInputSchema = z.object({
  moduleContent: z
    .string()
    .describe('The content of the module to generate an introduction for.'),
});
export type GenerateModuleIntroductionInput = z.infer<
  typeof GenerateModuleIntroductionInputSchema
>;

const GenerateModuleIntroductionOutputSchema = z.object({
  introduction: z
    .string()
    .describe('The generated introduction for the module.'),
});
export type GenerateModuleIntroductionOutput = z.infer<
  typeof GenerateModuleIntroductionOutputSchema
>;

export async function generateModuleIntroduction(
  input: GenerateModuleIntroductionInput
): Promise<GenerateModuleIntroductionOutput> {
  return generateModuleIntroductionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateModuleIntroductionPrompt',
  input: {schema: GenerateModuleIntroductionInputSchema},
  output: {schema: GenerateModuleIntroductionOutputSchema},
  prompt: `You are an expert course creator.

  You will generate an engaging and informative introduction for a module, given its content.

  Module Content: {{{moduleContent}}}

  Introduction:`,
});

const generateModuleIntroductionFlow = ai.defineFlow(
  {
    name: 'generateModuleIntroductionFlow',
    inputSchema: GenerateModuleIntroductionInputSchema,
    outputSchema: GenerateModuleIntroductionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
