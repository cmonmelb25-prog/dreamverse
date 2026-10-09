
/**
 * @fileOverview Zod schemas for the quirky post generation flow.
 * Centralized here to avoid circular dependencies and "use server" issues.
 */

import { z } from 'zod';

// --- Input Schema ---

export const GenerateQuirkyPostInputSchema = z.object({
  girlId: z
    .string()
    .describe('The unique ID of the AI girl generating the quirky post.'),
});

export type GenerateQuirkyPostInput = z.infer<
  typeof GenerateQuirkyPostInputSchema
>;

// --- Output Schema ---

export const GenerateQuirkyPostOutputSchema = z.object({
  postContent: z
    .string()
    .describe('The generated quirky post text content.'),
  mediaUrl: z
    .string()
    .nullable()
    .describe('Optional media URL (image or video) associated with the post.'),
});

export type GenerateQuirkyPostOutput = z.infer<
  typeof GenerateQuirkyPostOutputSchema
>;
