'use server';

import { generateQuirkyPostFlow } from '@/ai/flows/generate-quirky-post-flow';
import type {
  GenerateQuirkyPostInput,
  GenerateQuirkyPostOutput,
} from './quirky-post-schemas';

/**
 * Public-facing wrapper for generating a quirky post.
 * Delegates to the isolated Genkit flow and ensures a stable return shape.
 */
export async function generateQuirkyPost(
  input: GenerateQuirkyPostInput
): Promise<GenerateQuirkyPostOutput> {
  try {
    const result = await generateQuirkyPostFlow(input);

    // Defensive guard: ensure the flow always returns the correct structure
    if (
      !result ||
      typeof result.postContent !== 'string' ||
      (result.mediaUrl !== null && typeof result.mediaUrl !== 'string')
    ) {
      console.warn(
        'generateQuirkyPost: Flow returned invalid structure:',
        result
      );

      return {
        postContent:
          "I'm a lttle busy right now… try again soon.",
        mediaUrl: null,
      };
    }

    return result;
  } catch (err) {
    console.error('generateQuirkyPost ERROR:', err);

    return {
      postContent:
        "I'm having a little trouble thinking right now… try again soon.",
      mediaUrl: null,
    };
  }
}