'use server';


import { ai } from '@/ai/genkit';
import {
  GeneratePostInteractionsInputSchema,
  GeneratePostInteractionsOutputSchema,
} from '@/lib/ai-comms-types';

export const generatePostInteractionsFlow = ai.defineFlow(
  {
    name: 'generatePostInteractionsFlow',
    inputSchema: GeneratePostInteractionsInputSchema,
    outputSchema: GeneratePostInteractionsOutputSchema,
  },

  async (input) => {
    try {
      const { postContent, girlNames } = input;

      const systemPrompt = `
You are an admin assistant responsible for creating engaging content.
The post content is: "${postContent}"
The girls available are: ${girlNames.join(', ')}

Generate 2–4 interactions (likes or comments).
Return ONLY a JSON array of interactions.
Each interaction must include:
- girlName
- interactionType ("like" or "comment")
- commentText (string or null)
`.trim();

      const { output } = await ai.generate({
        model: "googleai/gemini-2.5-pro",
        messages: [
          {
            role: 'user',
            content: [{ text: systemPrompt }],
          },
        ],
        output: { schema: GeneratePostInteractionsOutputSchema },
        config: { temperature: 0.9 },
      });

      const interactions = output?.interactions;

      if (!Array.isArray(interactions)) {
        return { interactions: [] };
      }

      return { interactions };
    } catch (err) {
      console.error('generatePostInteractionsFlow ERROR:', err);
      return { interactions: [] };
    }
  }
);