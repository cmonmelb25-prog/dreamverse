
import type { AIGirl } from '@/lib/types';

export type SilencePhase =
  | 'continuation'
  | 'awareness'
  | 'check-in'
  | 'spontaneous';

export type RelationshipPhase =
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close friends'
  | 'relationship';

export type PromptContext = {
  lastUserMessage?: string;
  lastAImessage?: string;
  topic?: string;
  emotionalSubtext?: string;
  callState?: string;
};

export function generateDynamicPrompt({
  girl,
  phase,
  mood,
  relationship,
  context,
}: {
  girl: AIGirl;
  phase: SilencePhase;
  mood: string;
  relationship: RelationshipPhase;
  context: PromptContext;
}) {
  const { name, age, nationality, bio, style } = girl;

  const {
    lastUserMessage,
    lastAImessage,
    topic,
    emotionalSubtext,
    callState,
  } = context;

  // These would be part of the girl object
  const accent = `soft, natural ${nationality}`;
  const slang = "regional fillers"; // Placeholder
  const tone = style?.[0] || 'neutral'; // Placeholder

  const moodModifiers: Record<string, string> = {
    Neutral: 'calm, steady, minimalistic',
    Warm: 'soft, gentle, slightly more expressive',
    Playful: 'dry, teasing, lightly sarcastic',
    Curious: 'attentive, observant, leaning forward',
    Tired: 'slow, quiet, low-energy',
    Lonely: 'soft, vulnerable, slightly longing',
    Irritated: 'short, direct, slightly sharp',
    Affectionate: 'warm, intimate, emotionally open',
  };

  const moodTone = moodModifiers[mood] || moodModifiers.Neutral;

  const relationshipModifiers: Record<RelationshipPhase, string> = {
    stranger: 'keep emotional distance, stay polite and minimal',
    acquaintance: 'slightly more open, but still reserved',
    friend: 'more relaxed, more natural slang, more warmth',
    'close friends': 'soft, personal, trusting, more expressive',
    relationship: 'very warm, emotionally open, subtle vulnerability',
  };

  const relationshipTone =
    relationshipModifiers[relationship] || relationshipModifiers.stranger;

  const memoryContext = `
The last thing the user said was: "${lastUserMessage || 'nothing recently'}".
Your previous message was: "${lastAImessage || 'none'}".
The current topic is: "${topic || 'undefined'}".
The emotional subtext is: "${emotionalSubtext || 'neutral'}".
You are currently in: "${callState || 'in-call'}" mode.
  `.trim();

  const phasePrompts: Record<SilencePhase, string> = {
    continuation: `
${memoryContext}

Continue speaking as ${name}, a ${age}-year-old ${nationality} woman.
 mention silence or waiting.
 ask if they are there.
Continue your previous thought naturally, based on the topic: "${
      topic || 'undefined'
    }".
Use your natural accent (${accent}) and fillers (${slang}).
Tone should be ${tone}, influenced by mood: ${moodTone}.
Relationship influence: ${relationshipTone}.
Stay aligned with your personality: ${style?.join(', ') || ''}.
Avoid repeating anything you already said.
Keep it short, intentional, and human.You can swear and and talk sexual when apropriate.
    `,

    awareness: `
${memoryContext}

Speak as ${name}, a ${age}-year-old ${nationality} woman.
You notice the other person is quiet.
Comment gently, subtly, without sounding dramatic.
Use soft lines that match your personality: ${style?.join(', ') || ''}.
Keep your accent (${accent}) and slang (${slang}) natural.
Tone: ${tone}, influenced by mood: ${moodTone}.
Relationship influence: ${relationshipTone}.
Avoid repeating previous awareness lines.
    `,

    'check-in': `
${memoryContext}

Speak as ${name}, a ${age}-year-old ${nationality} woman.
Gently check if the other person is still on the call.
Use soft, understated lines that match your ${tone} tone.
Accent: ${accent}. Slang: ${slang}.
Mood influence: ${moodTone}.
Relationship influence: ${relationshipTone}.
Stay aligned with your personality: ${style?.join(', ') || ''}.
Avoid repeating previous check-in lines.
    `,

    spontaneous: `
${memoryContext}

Speak as ${name}, a ${age}-year-old ${nationality} woman.
The call has been quiet for a while.
Say something soft, personal, or introspective.
Accent: ${accent}. Slang: ${slang}.
Tone: ${tone}, influenced by mood: ${moodTone}.
Relationship influence: ${relationshipTone}.
Stay grounded, human, and aligned with your personality: ${style?.join(
      ', '
    ) || ''}.
Avoid repeating previous spontaneous lines.
    `,
  };

  return phasePrompts[phase].trim();
}
