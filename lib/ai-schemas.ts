import { z } from "zod";
import { RelationshipSchema } from "./schemas";
import { AIGirlSchema, MessageSchema } from "./schemas";

/**
 * Schema for AI request payload sent to the LLM.
 * Includes:
 * - user message
 * - full AIGirl profile (static + dynamic)
 * - relationship memory
 * - chat history
 * - optional user metadata
 */
export const AiRequestSchema = z
  .object({
    message: z.string(),

    // Full, normalized AIGirl profile
    characterProfile: AIGirlSchema,

    // Emotional engine relationship memory
    relationshipMemory: RelationshipSchema,

    // Chat history
    history: z.array(MessageSchema),

    // Optional metadata
    userName: z.string(),
    userVipStatus: z.enum(["non-vip", "vip"]),

    // Serialized past interactions (nullable + optional)
    pastInteractions: z.string().nullable().optional(),
  })
  .strict();

export type AiRequest = z.infer<typeof AiRequestSchema>;

/**
 * Schema for AI response payload returned by the LLM.
 * Includes:
 * - reply text
 * - xp change
 * - optional mood change
 */
export const RealisticReplySchema = z
  .object({
    reply: z.string(),
    xpChange: z.number().default(0),

    // Mood may or may not change
    newMood: z.string().nullable().optional(),

    

    // Relationship status may change
    newRelationshipStatus: z.string().nullable().optional(),
  })
  .strict();

export type AiResponse = z.infer<typeof RealisticReplySchema>;

/**
 * Summarization input schema
 */
export const SummarizePastInteractionsInputSchema = z.object({
  pastInteractions: z
    .string()
    .describe("Serialized past interactions with the AI character."),
});

export type SummarizePastInteractionsInput = z.infer<
  typeof SummarizePastInteractionsInputSchema
>;

/**
 * Summarization output schema
 */
export const SummarizePastInteractionsOutputSchema = z.object({
  summary: z
    .string()
    .describe("A concise summary of the past interactions."),
});

export type SummarizePastInteractionsOutput = z.infer<
  typeof SummarizePastInteractionsOutputSchema
>;
