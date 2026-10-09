import { z } from 'zod';

/**
 * @fileOverview Authoritative Type Definitions for the Chat Sequence Engine.
 * HARDENED: Identity-locked schema ensuring full spectrum traits for AIS.
 */

export const AiRequestSchema = z.object({
  girl: z.object({
    id: z.string(),
    name: z.string(),
    age: z.number(),
    location: z.string(),
    nationality: z.string(),
    bio: z.string(),
    occupation: z.string().describe('The character fixed profession or role.'),
    style: z.array(z.string()).optional().default([]),
    hobbies: z.array(z.string()).optional().default([]),
    interests: z.array(z.string()).optional().default([]),
    currentMood: z.string(),
    promotionTier: z.enum(['non-vip', 'vip']).optional(),
    relationshipStatus: z.string().optional(),
    relationshipTargetId: z.string().optional().nullable(),
    media: z.object({
      imageGallery: z.array(z.string()),
      exclusiveGallery: z.array(z.string()).optional(),
    }).optional(),
  }),

  relationship: z.object({
    level: z.string(),
    xp: z.number(),
    emotionalState: z.string(),
    silenceHours: z.number(),
    recentInteractions: z.array(z.any()).optional().default([]),
    userProfileMemory: z.object({
      preferredName: z.string().nullable().optional(),
      importantRoles: z.array(z.string()),
      customFacts: z.record(z.any()),
      nationality: z.string().optional().nullable(),
      location: z.string().optional().nullable(),
      age: z.number().optional().nullable(),
      occupation: z.string().optional().nullable(),
      children: z.number().optional().nullable(),
    }).optional().default({ importantRoles: [], customFacts: {} }),
    chatSummary: z.string().optional().nullable(),
  }),

  user: z.object({
    id: z.string(),
    name: z.string(),
    vipStatus: z.string(),
    relationshipStatus: z.string(),
    galleryImages: z.array(z.string()).optional(),
    location: z.string().optional().nullable(),
    occupation: z.string().optional().nullable(),
    nationality: z.string().optional().nullable(),
    age: z.union([z.number(), z.string()]).optional().nullable(),
  }),

  history: z.array(
    z.object({
      id: z.string().optional(),
      role: z.enum(['user', 'assistant']),
      content: z.string().optional(),
      mediaUrl: z.string().optional(),
      type: z.enum(['text', 'image', 'video', 'audio']).optional()
    })
  ),

  message: z.string().optional(),
  mediaUrl: z.string().optional(),
  type: z.enum(['text', 'image', 'video', 'audio']).optional(),
  isVoiceMessage: z.boolean().optional().nullable(),
  currentMessageId: z.string().optional().nullable(),
});

export type AiRequest = z.infer<typeof AiRequestSchema>;

/**
 * Superset schema for Prompt Input to include pre-processed blocks.
 */
export const PromptInputSchema = AiRequestSchema.extend({
  spontaneousMessage: z.string().optional().nullable(),
  voiceInstruction: z.string().optional().nullable(),
  resolvedUserName: z.string(),
});

export type PromptInput = z.infer<typeof PromptInputSchema>;

export const FlowReplySchema = z.object({
  text: z.string().optional().describe('The text of the message bubble.'),
  delayMs: z.number().describe('Typing delay.'),
  mood: z.string().describe('The mood for this bubble.'),
  mediaUrl: z.string().optional().describe("Absolute URL from character galleries."),
  type: z.enum(['text', 'image', 'video', 'audio']).optional().describe("Type of content")
});

export type FlowReply = z.infer<typeof FlowReplySchema>;

export const FlowResultSchema = z.object({
  replies: z.array(FlowReplySchema).min(1).max(20),
  newMood: z.string(),
  inferredUserTone: z.string().optional(),
  topic: z.string().optional(),
  xpChange: z.number().default(1),
  newRelationshipStatus: z.enum(['relationship', 'single']).optional()
});

export type FlowResult = z.infer<typeof FlowResultSchema>;

export type AiReply = {
  text?: string;
  mediaUrl?: string;
  delayMs: number;
  mood: string;
};

export type AiSequenceResponse = {
  replies: AiReply[];
  newMood: string;
  inferredUserTone: string;
  topic: string;
};
