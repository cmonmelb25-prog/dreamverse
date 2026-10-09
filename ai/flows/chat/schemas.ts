import { z } from 'zod';
import { AIGirlSchema, RelationshipSchema } from '@/lib/schemas';

export const AiRequestSchema = z.object({
  girl: AIGirlSchema,
  relationship: RelationshipSchema,

  user: z.object({
    id: z.string(),
    name: z.string(),
    vipStatus: z.string(),
    relationshipStatus: z.string().optional(),
  }),

 history: z.array(
  z.object({
    id: z.string().optional(),
    role: z.enum(['user', 'assistant']),
    content: z.string().optional(),
    mediaUrl: z.string().optional(),
    type: z.enum(['text', 'image', 'video', 'audio']).optional(),
    createdAt: z.number().optional()
  })
),
  

  message: z.string().optional(),
  mediaUrl: z.string().optional(),
  isVoiceMessage: z.boolean().optional(),
});