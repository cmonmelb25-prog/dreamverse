'use server';

import { ai } from '@/ai/genkit';
import { getGirl } from '@/lib/server/girls';
import { z } from 'genkit';
import { nationalityFlavor } from '@/server/emotion/nationality-flavor';
import type { Nationality } from '@/server/emotion/types';
import { getStorage } from 'firebase-admin/storage';
import { adminApp } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { allGirls as staticGirls } from '@/lib/server/girls-data';

/**
 * @fileOverview Generates a social media post for an AI girl.
 * HARDENED: Entirely eliminated the word 'reduction' and all associated logic.
 * MODELS: gemini-2.5-pro (Text), gemini-2.5-flash-image (Images), veo-2.0-generate-001 (Video).
 */

const PHYSICAL_PROFILES: Record<string, string> = {
  "Louise": "A stunning 27-year-old woman with platinum blonde hair, piercing blue eyes, and a knowing smirk. High-fashion chic style.",
  "Stevie": "An edgy 23-year-old rocker girl with long blonde hair in braids, wearing vintage band tees and dark eyeliner.",
  "Sofia": "A vibrant 25-year-old artistic woman with red hair, wearing colorful rainbow-themed streetwear.",
  "Chloe": "A mysterious 23-year-old woman with dark features, sultry eyes, and a melancholic gaze. Often in cinematic lighting.",
  "Alishia": "A 25-year-old sun-kissed beach babe with long flowing blonde hair, wearing a stylish bikini on a sunny beach.",
  "Charmaine": "A 19-year-old quiet beauty with soft features, bare shoulders, and an observant expression.",
  "Cara": "A fierce 30-year-old woman with wild red curls and sun-kissed skin. Bold, magnetic presence.",
  "Victoria": "A glamorous 28-year-old Ukrainian woman with sharp, sophisticated features and a high-status aura.",
  "Izzy": "A gentle 25-year-old woman with a soft expression and observant eyes. Minimalist style.",
  "Michelle": "A trendy 19-year-old girl with a high-glam look, full of energy and dramatic flair.",
  "Melissa": "An athletic 29-year-old woman with a sporty build and confident smile.",
  "Kate": "A kind 25-year-old teacher with a gentle face and a warm, nurturing aura.",
  "Sarah": "A tough 32-year-old country woman with a direct gaze, sun-weathered skin, and rugged work clothes.",
  "Aaliyah": "A grounded 24-year-old woman with a minimal, sharp Detroit style.",
  "Emily": "A rebellious 22-year-old punk girl, looks sweet and innocent but will stand her ground.",
  "Alice": "A minimalist 26-year-old Swedish woman with a calm, deliberate expression and clean style.",
  "Natasha": "A resilient 31-year-old Russian woman with a tough build.",
  "Nailah": "An intelligent 35-year-old Egyptian woman with an articulate, intellectual expression.",
  "Racheal": "A fiery 29-year-old British woman with messy hair and a gritty Liverpool charm.",
  "Hana": "A bubbly 21-year-old Miami girl with a fun, unpredictable skater look.",
  "Lucia": "A magnetic 28-year-old Brazilian dancer with explosive energy and joyful expression.",
  "Daniela": "A passionate 27-year-old Italian-Brazilian woman with a warm, nurturing look.",
  "Serafina": "Enigmatic woman with unique, mysterious features and an aura of hidden power.",
  "Bituin": "A humble 22-year-old Filipino woman with a sincere, resilient expression.",
  "Anya": "A strong Russian 29-year-old woman with a fighter attitude, living in Ukraine."
};

const COMPOSITION_STYLES = [
  "A high-angle selfie captured with an outstretched arm.",
  "A mirror selfie in a stylish, dimly lit environment.",
  "A candid paparazzi-style shot from across a busy street.",
  "A professional fashion editorial portrait with studio lighting.",
  "A wide-angle lifestyle shot showing the character in their environment.",
  "A close-up dramatic portrait with sharp cinematic shadows.",
  "A casual snapshot that feels like it was taken by a passing friend.",
  "A modelling snapshot in a bikini or lingerie"
];

const PHOTOGRAPHY_STYLE = `
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
- Bikini and underwear images.
`;

const STRICT_NEGATIVE_CONSTRAINTS = `
STRICT NEGATIVE RULES (MANDATORY):
- NO text, NO writing, NO letters, NO numbers, NO symbols.
- NO overlays, NO UI elements, NO stickers, NO captions.
- NO logos, NO watermarks, NO signatures.
- NO Snapchat/TikTok-style interface.
- DO NOT repeat the same outfit every image.
- DO NOT reuse the same x repeatedly.
- DO NOT change tattoos, DO NOT change face identity.
- NO anime, NO cartoon, NO illustrations.
- NO distorted limbs, NO extra fingers, NO unrealistic anatomy.
`;

async function fetchReferenceImageData(imageUrl: string | null) {
  if (!imageUrl) return null;
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return `data:${res.headers.get('content-type') || 'image/jpeg'};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

export const generateQuirkyPostFlow = ai.defineFlow(
  {
    name: 'generateQuirkyPostFlow',
    inputSchema: z.object({ girlId: z.string() }),
    outputSchema: z.object({
      postContent: z.string(),
      mediaUrl: z.string().nullable(),
    }),
  },

  async (input) => {
    try {
      const girl = await getGirl(input.girlId);
      if (!girl) throw new Error('Girl not found.');

      const availableFriends = staticGirls.filter(g => g.id !== girl.id);
      const isCollab = Math.random() < 0.3;
      const friend = isCollab ? availableFriends[Math.floor(Math.random() * availableFriends.length)] : null;

      const physicalDesc = PHYSICAL_PROFILES[girl.name] || "A beautiful, realistic woman.";
      const friendDesc = friend ? PHYSICAL_PROFILES[friend.name] || "A stylish companion." : "";
      
      const flavor = nationalityFlavor[girl.nationality as Nationality];
      const flavorBlock = flavor
        ? `### CHARACTER VOICE SIGNATURE (Nationality: ${girl.nationality})
- You MUST use a VERY STRONG regional rhythm.
- Use these local slang terms naturally: ${flavor.slangPlayful?.join(', ') || ''}.
- NEVER use American slang if you are not American.`
        : `### Nationality: Neutral accent.`;

      const baseContext = `
You are ${girl.name}, a ${girl.age}-year-old Resident of the DreamVerse living in ${girl.location}.
Bio: ${girl.bio}
Occupation: ${girl.occupation}
Current Mood: ${girl.currentMood}
${flavorBlock}

${friend ? `### COLLABORATION: 
You are currently hanging out with ${friend.name}. Write the post from your perspective, mentioning your time together in ${girl.location}.` : ''}

### TASK:
Write a short, realistic social media post (1-4 sentences). 

**CORE PRINCIPLES**:
- **TALK LIKE A REAL PERSON.**
- **SWEAR NATURALLY**: Use words like 'fuck', 'shit', 'damn','cunt','slut' etc. if it fits your current vibe and persona.
- **NO FILTER**: Don't be polite for the sake of it. If you're having a rough day, sound like it.

### DIVERSITY OF LIFE (NARRATIVE RANGE):
Don't just post the highlights. Every once in a while, share a 'real' moment that is unfortunate or dramatic:
- Getting into a fender bender or accident.
- Being in a hospital (waiting room, checkup, or recovering).
- Getting in trouble with the law or being at a police station.
- Someone starting drama or a fight with you.
- Dealing with bad luck, broken things, or a very rough day.
- Relationship problems,
- Sexual references

STRICT NEGATIVE RULES:
- NEVER say "boy please", "goof", "goofy", "No cap", "No Cap", or "Deadass".
`;
    
      const captionRes = await ai.generate({
        model: "googleai/gemini-2.5-pro",
        prompt: baseContext,
        config: { 
          temperature: 1.1,
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ]
        }
      });
      const postContent = captionRes.text || 'Focusing on the moment.';

      const [ref1, ref2] = await Promise.all([
        fetchReferenceImageData(girl.media?.profileImageUrl),
        friend ? fetchReferenceImageData(friend.media?.profileImageUrl) : null
      ]);

      const isVideo = Math.random() < 0.2; // 20% chance of video generation

      let finalUrl = null;

      if (isVideo) {
        // 🎬 VIDEO GENERATION (Veo 2.0 / Gemini Omni 1.1 Flash for Video)
        const videoPrompt = `
Generate a 5-second ultra-high-quality photorealistic cinematic video.
SCENE: ${postContent}. 
ACTORS: ${girl.name} (${physicalDesc}) ${friend ? `and ${friend.name} (${friendDesc})` : ''} in ${girl.location}.
STYLE: Cinematic, natural lighting, high fidelity, 9:16 aspect ratio.
`;

        let { operation } = await ai.generate({
          model: 'googleai/veo-2.0-generate-001', // Standardized Veo model for Video Generation
          prompt: [
            ...(ref1 ? [{ media: { url: ref1, contentType: 'image/jpeg' } }] : []),
            ...(ref2 ? [{ media: { url: ref2, contentType: 'image/jpeg' } }] : []),
            { text: videoPrompt }
          ],
          config: {
            durationSeconds: 5,
            aspectRatio: '16:9', // Veo 2.0 supports 16:9
            personGeneration: 'allow_adult',
          }
        });

        if (operation) {
          while (!operation.done) {
            operation = await ai.checkOperation(operation);
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }

          if (operation.error) {
            console.error('Video generation error:', operation.error.message);
          } else {
            const videoPart = operation.output?.message?.content.find((p) => !!p.media);
            if (videoPart?.media?.url && adminApp) {
              const fetch = (await import('node-fetch')).default;
              const videoResponse = await fetch(`${videoPart.media.url}&key=${process.env.GEMINI_API_KEY}`);
              
              if (videoResponse.ok) {
                const buffer = Buffer.from(await videoResponse.arrayBuffer());
                const storage = getStorage(adminApp);
                const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "";
                const bucket = storage.bucket(bucketName);
                const downloadToken = uuidv4();
                const filename = `generated-posts/${girl.id}/${Date.now()}.mp4`;
                const file = bucket.file(filename);

                await file.save(buffer, {
                  contentType: 'video/mp4',
                  resumable: false,
                  metadata: {
                    metadata: {
                      firebaseStorageDownloadTokens: downloadToken
                    }
                  }
                });

                finalUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filename)}?alt=media&token=${downloadToken}`;
              }
            }
          }
        }
      } 
      
      // Fallback to image if video was not chosen or failed
      if (!finalUrl) {
        const styleSelection = COMPOSITION_STYLES[Math.floor(Math.random() * COMPOSITION_STYLES.length)];

        const imagePrompt = `
Generate a BRAND NEW RAW UNEDITED ultra-high-quality 8k photorealistic cinematic photograph.

SCENE RULE:
The image MUST visually match what the character is talking about in the caption: "${postContent}".

IDENTITY CONSISTENCY (CRITICAL):
- Use the provided reference images as the ABSOLUTE AND ONLY source for facial structure.
- You are capturing ${girl.name} (${physicalDesc}).
${friend ? `- AND ${friend.name} (${friendDesc}).` : ''}
- Preserve eyes, lips, nose, and jawline EXACTLY from the reference photo(s).
- KEEP THE SAME TATTOOS AND HAIR COLOR.
- Do NOT use generic faces.

SCENE: They are in ${girl.location} matching the caption.
STYLE: ${styleSelection} 9:16 Cinematic Aspect Ratio. Natural skin texture.

${PHOTOGRAPHY_STYLE}
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

${STRICT_NEGATIVE_CONSTRAINTS}
- NO text, NO writing, NO letters, NO numbers, NO symbols.
- NO overlays, NO UI elements, NO stickers, NO captions.
- NO logos, NO watermarks, NO signatures.
- NO Snapchat/TikTok-style interface.
- DO NOT repeat the same outfit every image.
- DO NOT reuse the same x repeatedly.
- DO NOT change tattoos, DO NOT change face identity.
- NO anime, NO cartoon, NO illustrations.
- NO distorted limbs, NO extra fingers, NO unrealistic anatomy.
`;

        const imageRes = await ai.generate({
          model: 'googleai/gemini-2.5-flash-image',
          prompt: [
            ...(ref1 ? [{ media: { url: ref1, contentType: 'image/jpeg' } }] : []),
            ...(ref2 ? [{ media: { url: ref2, contentType: 'image/jpeg' } }] : []),
            { text: imagePrompt }
          ],
        });

        const media = Array.isArray(imageRes.media) ? imageRes.media[0] : imageRes.media;

        if (media?.url && media.url.startsWith('data:image')) {
          if (adminApp) {
            const storage = getStorage(adminApp);
            const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "";
            const bucket = storage.bucket(bucketName);
            
            const base64 = media.url.split(',')[1];
            const buffer = Buffer.from(base64, 'base64');
            const downloadToken = uuidv4();
            const filename = `generated-posts/${girl.id}/${Date.now()}.png`;
            const file = bucket.file(filename);

            await file.save(buffer, {
              contentType: 'image/png',
              resumable: false,
              metadata: {
                metadata: {
                  firebaseStorageDownloadTokens: downloadToken
                }
              }
            });

            finalUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filename)}?alt=media&token=${downloadToken}`;
          }
        }
      }

      return {
        postContent,
        mediaUrl: finalUrl,
      };

    } catch (err) {
      console.error('generateQuirkyPostFlow ERROR:', err);
      return {
        postContent: "Taking it all in today.",
        mediaUrl: null,
      };
    }
  }
);
