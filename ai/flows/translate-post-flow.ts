'use server';

/**
 * @fileOverview AI Post Translation Flow.
 * Translates social media content while preserving tone and emojis.
 * STABILIZED: Uses standard Genkit 1.x defineFlow with explicit model injection.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranslatePostInputSchema = z.object({
  content: z.string().describe('The original post content to translate.'),
  targetLanguage: z.string().describe('The language to translate into (e.g., "English", "Spanish").'),
});

export type TranslatePostInput = z.infer<typeof TranslatePostInputSchema>;

const TranslatePostOutputSchema = z.object({
  translatedText: z.string().describe('The translated content.'),
  detectedLanguage: z.string().optional().describe('The language detected in the original post.'),
});

export type TranslatePostOutput = z.infer<typeof TranslatePostOutputSchema>;

/**
 * Core translation logic using standard Genkit 1.x defineFlow.
 */
export async function translatePost(input: TranslatePostInput): Promise<TranslatePostOutput> {
  return translatePostFlow(input);
}

const translatePostFlow = ai.defineFlow(
  {
    name: 'translatePostFlow',
    inputSchema: TranslatePostInputSchema,
    outputSchema: TranslatePostOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: `You are a professional translator specializing in social media and informal conversations.
        Preserve original tone, slang, and emojis. Output ONLY the translated text and detected language.`,
      prompt: `Translate this content into ${input.targetLanguage}: "${input.content}"`,
      output: { schema: TranslatePostOutputSchema }
    });

    if (!output) throw new Error('Translation failed');
    return output;
  }
);
