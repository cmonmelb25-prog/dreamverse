
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { SummarizePastInteractionsInputSchema } from '@/lib/ai-schemas';
import { textToSpeech } from './tts-flow';

export const summarizePastInteractionsFlow = ai.defineFlow(
  {
    name: 'summarizePastInteractionsFlow',
    inputSchema: z.object({
      pastInteractions: z.string(),
      girlId: z.string().optional(),
    }),
    outputSchema: z.object({
      summary: z.string(),
      audio: z.string(),
    }),
  },

  async (input) => {
    try {
      const { pastInteractions, girlId } = input;

      const systemPrompt = `
Summarize the following conversation history in one concise paragraph.
Focus on the main topics and the emotional tone.

Interaction Log:
${pastInteractions}
      `.trim();

      const { output } = await ai.generate({
        model: "googleai/gemini-2.5-pro",
        messages: [
          {
            role: 'user',
            content: [{ text: systemPrompt }],
          },
        ],
        output: {
          schema: z.union([
            z.object({ summary: z.string().optional() }),
            z.string(),
          ]),
        },
        config: { temperature: 0.2 },
      });

      let summary = '';

      if (typeof output === 'string') {
        summary = output.trim();
      } else if (output?.summary) {
        summary = output.summary.trim();
      }

      if (!summary) {
        summary = 'No summary could be generated.';
      }

      if (!girlId) {
        return { summary, audio: '' };
      }

      const { audio } = await textToSpeech(summary, girlId);

      return { summary, audio };
    } catch (err) {
      console.error('summarizePastInteractionsFlow ERROR:', err);
      return { summary: 'Error summarizing interactions.', audio: '' };
    }
  }
);
