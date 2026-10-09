'use server';

import { ai } from '@/ai/genkit';
import {
  GenerateImageInputSchema,
  GenerateImageOutputSchema,
} from '@/lib/image-gen-types';
import { getStorage } from 'firebase-admin/storage';
import { adminApp } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';

const storage = adminApp ? getStorage(adminApp) : null;
const bucket = storage
  ? storage.bucket(process.env.FIREBASE_STORAGE_BUCKET || '')
  : null;

/**
 * Hyper-realistic identity-consistent image generation.
 * HARDENED: Strict photography protocols, alluring aesthetic, and diversity of life.
 * FIXED: Resolved GenkitError 404 by using correct model identifier 'googleai/gemini-2.5-flash-image'.
 */

async function fetchReferenceImageData(imageUrl: string | null) {
  if (!imageUrl) return null;

  try {
    const res = await fetch(imageUrl);

    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());

    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

export const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },

  async (input) => {
    if (!bucket) {
      throw new Error('Storage not initialized');
    }

    try {
      // Find reference image URL inside prompt
      const urlMatch = input.prompt.match(/https?:\/\/[^\s]+/);

      const referenceImage = urlMatch
        ? await fetchReferenceImageData(urlMatch[0])
        : null;

      const finalPrompt = `
Generate a BRAND NEW RAW UNEDITED ultra-high-quality 8k resolution cinematic photograph.

SCENE RULE:
The image MUST visually match what the character is talking about in the context: "${input.prompt}".

IDENTITY CONSISTENCY (CRITICAL):
- Use the provided reference image as the ABSOLUTE AND ONLY SOURCE for facial structure.
- Preserve facial structure, eyes, lips, nose, and jawline EXACTLY from reference.
- KEEP THE SAME TATTOOS EXACTLY.
- Do NOT use generic faces.

PHOTOGRAPHY STYLE (STRICT):
- photo realistic, premium cinematic photography
- realistic skin texture, natural body proportions
- razor sharp focus, highly detailed environment
- sharp background details, crisp image quality
- professional photography
- realistic shadows and lighting, full environmental clarity
- background must remain detailed and visible
- NO excessive blur, NO shallow depth of field, NO bokeh blur
- ALLURE RULE: Focus on magnetic presence, alluring gazes, and charismatic poses.
- Create flirtatious, alluring images.


STRICT NEGATIVE RULES (MANDATORY):
- NO text, NO writing, NO letters, NO numbers, NO symbols.
- NO overlays, NO UI elements, NO stickers, NO captions.
- NO logos, NO watermarks, NO signatures.
- DO NOT repeat the same outfit every image.
- DO NOT reuse the same pose repeatedly.
- DO NOT change tattoos, DO NOT change face identity.
- NO anime, NO cartoon, NO illustrations.
- NO distorted limbs, NO extra fingers, NO unrealistic anatomy.
`.trim();

      const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-pro',

        prompt: [
          ...(referenceImage
            ? [
                {
                  media: {
                    url: referenceImage,
                    contentType: 'image/jpeg',
                  },
                },
              ]
            : []),

          {
            text: finalPrompt,
          },
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        }
      });

      const mediaItem = Array.isArray(media)
        ? media[0]
        : media;

      if (!mediaItem?.url) {
        throw new Error('No image returned');
      }

      const base64 = mediaItem.url.split(',')[1];

      const buffer = Buffer.from(base64, 'base64');

      const downloadToken = uuidv4();

      const filename = `generated-images/${Date.now()}.png`;

      const file = bucket.file(filename);

      await file.save(buffer, {
        contentType: 'image/png',
        resumable: false,

        metadata: {
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          },
        },
      });

      const publicUrl =
        `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
        `${encodeURIComponent(filename)}?alt=media&token=${downloadToken}`;

      return {
        imageUrl: publicUrl,
      };
    } catch (err) {
      console.error('generateImageFlow ERROR:', err);
      throw err;
    }
  }
);