
'use server';

import { generateImageFlow } from './flows/generate-image-flow';
import type {
  GenerateImageInput,
  GenerateImageOutput,
} from '@/lib/image-gen-types';

import { generateQuirkyPostFlow } from '@/ai/flows/generate-quirky-post-flow';
import type {
  GenerateQuirkyPostInput,
  GenerateQuirkyPostOutput,
} from './handlers/quirky-post-schemas';

import { summarizePastInteractionsFlow } from '@/ai/flows/summarize-past-interactions-flow';
import type {
  SummarizePastInteractionsInput,
  SummarizePastInteractionsOutput,
} from '@/lib/ai-schemas';

// ---------------------------------------------------------------------------
// QUIRKY POST GENERATION
// ---------------------------------------------------------------------------
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
          "I'm a little busy right now… try again soon.",
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

// ---------------------------------------------------------------------------
// SUMMARIZE INTERACTIONS
// ---------------------------------------------------------------------------
export async function summarizePastInteractions(
  input: SummarizePastInteractionsInput
): Promise<SummarizePastInteractionsOutput> {
  try {
    const result = await summarizePastInteractionsFlow(input);

    // Defensive guard: ensure the flow always returns a valid summary
    if (!result || typeof result.summary !== 'string') {
      console.warn(
        'summarizePastInteractions: Flow returned invalid structure:',
        result
      );

      return {
        summary:
          "I couldn't summarize that right now, but we can try again soon.",
      };
    }

    return result;
  } catch (err) {
    console.error('summarizePastInteractions ERROR:', err);

    return {
      summary:
        "I couldn't summarize that right now, but we can try again soon.",
    };
  }
}

// ---------------------------------------------------------------------------
// IMAGE GENERATION
// ---------------------------------------------------------------------------
export async function generateImage(
  input: GenerateImageInput
): Promise<GenerateImageOutput> {
  try {
    return await generateImageFlow(input);
  } catch (err) {
    console.error('generateImage ERROR:', err);

    return { imageUrl: null };
  }
}
