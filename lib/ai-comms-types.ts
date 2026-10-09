import { z } from 'zod';

// --- Mood-based replies ---

export const MoodBasedReplyInputSchema = z.object({
  message: z.string(),
  girlId: z.string(),
  userId: z.string(),
  userName: z.string(),

  userVipStatus: z.enum(['non-vip', 'vip', ]),
  relationshipXP: z.number(),

  relationshipStatus: z.enum(['stranger', 'acquaintance','friend', 'close friends', 'relationship']),
  relationshipLevel: z.enum(['stranger', 'acquaintance', 'friend', 'close friends', 'relationship']),

mood: z.enum([
  'Affectionate',
   'Afraid',
   'Angry',
   'Anxious',
   'Attacked',
   'Bored',
   'Brave',
   'Calm',
   'Charismatic',
   'Charming',
   'Chill',
   'Clingy',
   'Cold response',
   'Compassionate',
   'Competitive',
   'Confident',
   'Content',
   'Contemplative',
   'Creative',
   'Curious',
   'Cynical',
   'Defensive',
   'Depressed',
   'Determined',
   'Dreamy',
   'Energetic',
   'Excited',
   'Exhausted',
   'Fiery',
   'Flirty',
   'Focused',
   'Frustrated',
   'Grumpy',
   'Guarded',
   'Guilt',
   'Happy',
   'Hopeful',
   'Humble',
   'Hypnotic',
   'Indenial',
   'Inspired',
   'Jealous',
   'Joyful',
   'Lonely',
   'Loved',
   'Melancholy',
   'Mixedemotions',
   'Moody',
   'Mysterious',
   'Negative',
   'Neutral',
   'Nostalgic',
   'Nurturing',
   'Overwhelmed',
   'Paranoid',
   'Passionate',
   'Peaceful',
   'Peppy',
   'Pickingafight',
   'Playful',
   'Polite',
   'Positive',
   'Rebellious',
   'Romantic',
   'Sad',
   'Sarcastic',
   'Sassy',
   'Satisfied',
   'Seductive',
   'Sexual',
   'Shy',
   'Soulful',
   'Spontaneous',
   'Stoic',
   'Sympathetic',
   'Teasing',
   'Tough',
   'Unwanted',
   'Upbeat',
   'Vibrant',
   'Whimsical'
]),
  pastInteractions: z.string().nullable().optional(),

  allowedMoods: z.array(z.string()),
}).strict();

export type MoodBasedReplyInput = z.infer<typeof MoodBasedReplyInputSchema>;

export const MoodBasedReplyOutputSchema = z.object({
  reply: z.string(),
  xpChange: z.number(),
  newMood: z.string(),
  dateMovieId: z.string().optional(),
}).strict();

export type MoodBasedReplyOutput = z.infer<typeof MoodBasedReplyOutputSchema>;


// --- Post interactions ---

export const GeneratePostInteractionsInputSchema = z.object({
  postContent: z.string(),
  girlNames: z.array(z.string()),
}).strict();

export type GeneratePostInteractionsInput = z.infer<typeof GeneratePostInteractionsInputSchema>;

const InteractionSchema = z.object({
  girlName: z.string(),
  interactionType: z.enum(['like', 'comment']),
  commentText: z.string().nullable().optional(),
}).strict();

export const GeneratePostInteractionsOutputSchema = z.object({
  interactions: z.array(InteractionSchema),
}).strict();

export type GeneratePostInteractionsOutput = z.infer<typeof GeneratePostInteractionsOutputSchema>;