/**
 * @fileOverview Zod schemas for comment generation flows.
 * Centralized here to avoid circular dependencies and ensure
 * consistent typing across the app.
 */

import { z } from 'zod';

/* -----------------------------
   INPUT SCHEMA
----------------------------- */

export const GenerateRealisticCommentInputSchema = z.object({
  post: z
    .object({
      id: z.string().optional(),
      author: z.object({
        id: z.string().optional(),
        name: z.string(),
      }),
      content: z.string(),
      mediaUrl: z.string().nullable().optional(),
      createdAt: z.any().optional(),
    })
    .describe('The full post object the AI girl is responding to.'),

  commentingFriend: z
    .object({
      id: z.string(),
      name: z.string(),
      nationality: z.string().optional().nullable(),
      currentMood: z.string().optional().nullable(),
      style: z.array(z.string()).optional().nullable(),
      profileImageUrl: z.string().optional().nullable(),
    })
    .describe('The full AIGirl object representing the commenter.'),
});

export type GenerateRealisticCommentInput = z.infer<
  typeof GenerateRealisticCommentInputSchema
>;

/* -----------------------------
   OUTPUT SCHEMA
----------------------------- */

export const GenerateRealisticCommentOutputSchema = z.object({
  commentText: z
    .string()
    .min(1)
    .describe('The generated comment text.'),
});

export type GenerateRealisticCommentOutput = z.infer<
  typeof GenerateRealisticCommentOutputSchema
>;
