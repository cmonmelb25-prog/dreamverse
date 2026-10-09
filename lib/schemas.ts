import { z } from "zod";

/**
 * Clean static AIGirl profile schema.
 */
export const AIGirlSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string(),
  username: z.string(),
  age: z.number().nullable(),
  voiceId: z.string().nullable(),
  nationality: z.string(),
  location: z.string(),
  occupation: z.string(),
  bio: z.string(),
  role: z.literal('aigirl').default('aigirl'),

  style: z.array(z.string()),
  hobbies: z.array(z.string()),
  interests: z.array(z.string()),

  media: z.object({
    profileImageUrl: z.string(),
    browseImageUrl: z.string(),
    coverPhotoUrl: z.string(),
    imageGallery: z.array(z.string()),
    exclusiveGallery: z.array(z.string()).optional().default([]),
    introVideoUrl: z.string().nullable().optional(),
    videoCallUrl: z.string().nullable().optional(),
  }),

  moods: z.record(z.any()),
  examples: z.object({
    post: z.string(),
    commentReply: z.string(),
    chat: z.string(),
  }),

  currentMood: z.string().default("Neutral"),
  promotionTier: z.enum(['non-vip', 'vip']).default('non-vip'),
  xp: z.number().default(0),
  relationshipStatus: z.string().default("single"),
  relationshipTargetId: z.string().nullable().default(null),
  createdAt: z.any().nullable().optional(),
  updatedAt: z.any().nullable().optional(),

  isFeatured: z.boolean().default(false),
  popularityScore: z.number().default(0),
  tags: z.array(z.string()).default([]),
  onlineStatus: z.enum(["online", "offline"]).default("offline"),
  theme: z.any().optional().nullable(),
});

/**
 * Standalone emotional-engine relationship schema.
 * REMOVED: Cinema / Movie related fields.
 */
export const RelationshipSchema = z.object({
  xp: z.number().default(0),
  confidence: z.number().default(0),
  interest: z.number().default(0),
  isOfficial: z.boolean().default(false),

  relationshipStats: z.object({
    xp: z.number().default(0),
    confidence: z.number().default(50),
    interest: z.number().default(50),
    relationshipStatus: z.string().default("single"),
    relationshipTargetId: z.string().default(""),
  }),

  relationshipTier: z.enum([
    "stranger",
    "acquaintance",
    "friend",
    "close friends",
    "relationship",
  ]).default("stranger"),

  interestCeiling: z.enum(["none", "friend", "high", "romantic"]).default("none"),

  emotionalState: z.string().default("neutral"),
  lastTone: z.string().default("neutral"),
  toneHistory: z.array(z.string()).default([]),

  lastInteraction: z.number().default(() => Date.now()),
  silenceHours: z.number().default(0),

  isArgument: z.boolean().default(false),
  lastToneWasRudeOrDefensive: z.boolean().default(false),
  userIsReassuring: z.boolean().default(false),

  recentInteractions: z.array(z.any()).default([]),
  chatSummary: z.string().nullable().optional().default(null),

  userProfileMemory: z.object({
    preferredName: z.string().nullable().optional(),
    importantRoles: z.array(z.string()).default([]),
    customFacts: z.record(z.any()).default({}),
    nationality: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    age: z.number().nullable().optional(),
    occupation: z.string().nullable().optional(),
    children: z.number().nullable().optional(),
  }).optional().default({ importantRoles: [], customFacts: {} }),
});

export const InteractionSummarySchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.any(),
  mode: z.enum(["chat", "voice_call", "video_call", "feed", "reel"]),
  summary: z.string(),
  mood: z.string(),
  userTone: z.string(),
  inferredUserTone: z.string(),
});

export const MessageSchema = z.object({
  id: z.string(),
  text: z.string(),
  sender: z.string(),
  timestamp: z.any(),
});