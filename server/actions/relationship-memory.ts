'use server';

/**
 * @fileOverview Long-term User Fact Extraction Engine.
 * Uses Gemini for reliable memory management.
 * HARDENED: Now returns updated memory for immediate use in the chat cycle.
 * SAFE VERSION: Never overwrites girl identity. Stores ONLY user facts.
 */

import { db } from '@/lib/firebase-admin';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

/**
 * Analyzes a message for important user facts and saves them automatically using AI.
 * RETURNS: The updated userProfileMemory object.
 */
export async function autoDetectFacts(userId: string, girlId: string, message: string) {
  if (!db || !message || message.length < 2) return null;

  try {
    // 1. EXTRACT FACTS USING AI
    const { output } = await ai.generate({
      model: "googleai/gemini-2.5-pro",
      system: `
        You are a memory processor for a Resident of the DreamVerse.
        Extract ONLY facts about the USER.
        NEVER infer or store facts about the AI girl.
        Return null for fields not mentioned.
        Be precise and concise.
      `,
      prompt: `User says: "${message}"`,
      output: {
        schema: z.object({
          nationality: z.string().nullable(),
          location: z.string().nullable(),
          age: z.number().nullable(),
          occupation: z.string().nullable(),
          children: z.number().nullable(),
          otherFacts: z.record(z.string()).nullable().describe(
            "Other facts like 'loves sushi', 'has a cat', 'is a gamer'"
          )
        })
      }
    });

    if (!output) return null;

    // SAFETY: Store ONLY USER facts, never overwrite girl identity
    const userFacts: any = {};
    if (output.nationality) userFacts.nationality = output.nationality;
    if (output.location) userFacts.location = output.location;
    if (output.age) userFacts.age = output.age;
    if (output.occupation) userFacts.occupation = output.occupation;
    if (output.children !== null) userFacts.children = output.children;

    const ref = db
      .collection('users')
      .doc(userId)
      .collection('relationships')
      .doc(girlId);

    // 2. TRANSACTIONAL ATOMIC MERGE
    const finalMemory = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() || {};

      const existing = data.userProfileMemory || {
        customFacts: {},
        importantRoles: [],
        userFacts: {}
      };

      const newCustomFacts = {
        ...(existing.customFacts || {}),
        ...(output.otherFacts || {})
      };

      const updatedMemory = {
        ...existing,
        customFacts: newCustomFacts,
        userFacts: {
          ...(existing.userFacts || {}),
          ...userFacts
        }
      };

      tx.set(
        ref,
        { userProfileMemory: updatedMemory },
        { merge: true }
      );

      return updatedMemory;
    });

    return finalMemory;

  } catch (err) {
    console.warn("[autoDetectFacts] AI extraction failed:", err);
    return null;
  }
}
