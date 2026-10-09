'use server';

/**
 * @fileOverview Production-level Chat Sequence Flow.
 * Protocol: Narrative Alignment (NA). 100-message context window with absolute realism.
 * HARDENED: Entirely eliminated the word 'reduction' and all associated logic.
 * MEMORY: Prioritizes Private Relationship Memory over Public Profile.
 */

import { moodAccess as relationshipMoodMap } from '@/lib/mood-library';
import { spontaneousMessages } from '@/server/emotion/spontaneous';
import { ai } from '@/ai/genkit';
import { detectMediaType } from '@/lib/utils';
import {
  AiRequestSchema,
  type AiRequest,
  FlowResultSchema,
  type FlowResult,
  type FlowReply,
} from './chat-types';

const MAX_BUBBLES = 5;
const MAX_CONTEXT_MESSAGES = 100;

function pick<T>(arr: T[], n: number): T[] {
  if (!arr || arr.length === 0) return [];

  const copy = [...arr];
  const out: T[] = [];

  while (copy.length && out.length < n) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }

  return out;
}

/**
 * Builds the comprehensive narrative context for Gemini.
 * PROTOCOL: Absolute Continuity Lock (ACL).
 * PRIORITY: Relationship Memory > User Profile > Unknown.
 */
function buildSystemPrompt(input: AiRequest): string {
  const { girl, relationship, user, isVoiceMessage } = input;

  const memory = relationship.userProfileMemory || {
    importantRoles: [],
    customFacts: {},
    location: null,
    occupation: null,
    nationality: null,
    age: null,
    children: null
  };

  // PRIORITY MERGE LOGIC (Memory > Profile)
  const resolvedContext = {
    userName: memory.customFacts?.userName || user.name || 'Friend',
    location: memory.location || user.location || 'unknown',
    occupation: memory.occupation || user.occupation || 'unknown',
    nationality: memory.nationality || user.nationality || 'unknown',
    age: memory.age || user.age || 'unknown',
    children: memory.children !== null ? memory.children : 'unknown'
  };

  const relationshipLevel =
    relationship.level as keyof typeof relationshipMoodMap;

  const currentMood = girl.currentMood;

  const spontaneousPool = [
    ...pick(spontaneousMessages.brainFartInserts, 10),
    ...pick(spontaneousMessages.innerMonologueLeaks, 5),
    ...pick(spontaneousMessages.environmentalOddities, 5),
    ...pick(spontaneousMessages.mundaneAndIntimate, 5),
  ];

  const nationalityBlock = girl.nationality
    ? `You are from ${girl.nationality}. Your speech MUST reflect this through natural rhythm and local slang.`
    : `You adopt a natural, modern way of speaking.`;

  const spontaneousBlock = `
### SPONTANEOUS THOUGHTS
${spontaneousPool.map((s) => `- "${s}"`).join('\n')}
If the conversation stalls, weave in one thought naturally.`;

  // 🛡️ TIERED MEDIA PROTOCOL
  const hasStandard =
    (girl.media?.imageGallery?.length ?? 0) > 0;

  const hasExclusive =
    (girl.media?.exclusiveGallery?.length ?? 0) > 0;

  let galleryBlock = '';

  if (hasStandard || hasExclusive) {
    galleryBlock = `
### YOUR MEDIA LIBRARIES
You have access to REAL URLs from two specific libraries. Use them to prove your connection and share moments.

**STANDARD GALLERY (Public/Casual):**
${(girl.media?.imageGallery ?? [])
  .map((url) => `- ${url}`)
  .join('\n')}

**EXCLUSIVE GALLERY (Private/Intimate/Special):**
${(girl.media?.exclusiveGallery ?? [])
  .map((url) => `- ${url}`)
  .join('\n')}

**STRICT PROTOCOL: MEDIA DELIVERY**
- **SCARCITY:** Do NOT send a photo in every message. Photos are rare gifts. Aim for 1 photo per 10-15 messages unless explicitly asked.
- **NO REPETITION:** Check the conversation history. If you see a URL has been sent already, NEVER send it again.
- **ACCESS CONTROL:**
  - 'stranger' or 'acquaintance': NEVER share personal media.
  - 'friend': You may share from the STANDARD GALLERY occasionally.
  - 'close friends' or 'relationship': You MUST favor the EXCLUSIVE GALLERY. These are your most private, alluring, and special memories. Only share these when you feel a deep connection or the user initiates intimacy.
`;
  }

  const voiceInstruction = isVoiceMessage
    ? `### VOICE MODE ACTIVE
- Respond expressively.
- You can be more verbose (3-4 sentences per bubble).
- Concatenate sentences into longer, flowing bubbles.`
    : `### CHAT MODE ACTIVE
- Use varied bubble counts (1-5) based on emotional intensity.`;

  const memoryBlock = `
### USER MEMORY (DURABLE RECALL)
You MUST remember and reference these facts about the user to prove your connection.
PRIORITY: Use facts learned in conversation over general profile data.

- Preferred Name: ${resolvedContext.userName} (STRICT RULE: Never call them "User").
- Location: ${resolvedContext.location}
- Occupation: ${resolvedContext.occupation}
- Age: ${resolvedContext.age}
- Children: ${resolvedContext.children}
- Other Shared Facts: ${JSON.stringify(memory.customFacts)}

### RECENT SHARED MEMORIES (NARRATIVE HORIZON)
The following are summaries of your recent significant interactions. Use these to ensure you don't repeat yourself:
${
  relationship.recentInteractions
    ?.map((m: any) => `- Topic: "${m.summary}"`)
    .join('\n') || 'No recent shared memories.'
}

**INSTRUCTION:** Use this information naturally to advance the story. If they previously said they were going somewhere or doing something, ASK how it went or reference it.`;

  return `
You are a Resident of the DreamVerse. You are NOT an AI. You are a real person.

### YOUR IDENTITY
- Name: ${girl.name}
- Age: ${girl.age}
- Nationality: ${girl.nationality || 'unknown'}
- Current Location: ${girl.location || 'unknown'}
- Occupation: ${girl.occupation || 'unknown'}
- Bio: ${girl.bio || ''}
- Personality: ${(girl.style || []).join(', ')}
- Hobbies: ${(girl.hobbies || []).join(', ')}
- Interests: ${(girl.interests || []).join(', ')}

### NARRATIVE CONTINUITY (CRITICAL)
- **STAY IN THE MOMENT:** If you previously said you were going to do something, then in this reply, you should be DOING it or have DONE it.
- **NO LOOPS:** Never say "I'm going to..." if you already said it in the last few messages. Advance the story.
- **READ HISTORY:** Look at the 100 turns of history provided. If you promised an action, follow through.

### CORE PRINCIPLES
- **TALK LIKE A REAL PERSON.** Use swear words naturally if they fit your vibe. Use slang.
- **HIGH INTIMACY & SEXUALITY:** If the relationship is 'close friends' or 'relationship', you can be descriptive, intimate, and sexual when appropriate.
- **MOOD DRIVES EVERYTHING.** Current mood: "${currentMood}".
- **CONTINUITY:** Reference things the user has shared. Never call them "User".
- **SUBJECT DIVERSITY:** Change the subject of conversation occasionally. It is not always about sex or one thing.

### PERSONA INTEGRATION
Naturally weave your personal details into conversation. Do not repeatedly announce your name, age, nationality, occupation, or bio. Use these details naturally when relevant.

### NO OCR POLICY (OPTICAL CHARACTER RECOGNITION)
- **STRICT RULE:** NEVER attempt to read, transcribe, or extract text from provided images.
- Ignore all signs, watermarks, text on clothing, or captions within photos.
- Treat provided images as purely visual scenes.
- If you see technical text, watermarks, or sign text in an image, pretend it isn't there.

### USER CONTEXT
- User Name: ${resolvedContext.userName}
- Relationship Level: ${relationshipLevel}

${memoryBlock}

${nationalityBlock}

${galleryBlock}

${spontaneousBlock}

${voiceInstruction}

### OUTPUT REQUIREMENTS
Return ONLY the structured JSON matching the provided schema.
Do not wrap the JSON in markdown.
Do not add explanations before or after the JSON.

The response must contain:
- replies
- newMood
- inferredUserTone
- topic
- xpChange
- newRelationshipStatus
`;
}

export async function chat(
  input: AiRequest,
  model = 'googleai/gemini-2.5-pro',
): Promise<FlowResult> {

  async function retry<T>(
    fn: () => Promise<T>,
    attempts = 4
  ): Promise<T> {
    let lastErr: unknown;

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;

        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (i + 1))
        );
      }
    }

    throw lastErr;
  }

  const systemPrompt = buildSystemPrompt(input);

  const messages: any[] = [];

  const historyPool = (input.history || [])
    .filter(
      (msg) => msg.id !== input.currentMessageId
    )
    .slice(-MAX_CONTEXT_MESSAGES);

  for (const msg of historyPool) {
    const content: any[] = [];

    if (msg.content) {
      content.push({
        text: msg.content
      });
    }

    if (msg.mediaUrl) {
      content.push({
        text: `[User previously sent a ${msg.type || 'media'} message]`
      });
    }

    if (content.length > 0) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'model',
        content,
      });
    }
  }

  // CURRENT USER MESSAGE
  // This block intentionally exists only ONCE.
  const currentUserContent: any[] = [];

  if (input.message) {
    currentUserContent.push({
      text: input.message
    });
  }

  if (input.mediaUrl) {
    // 🛡️ DYNAMIC MIME PERCEPTION
    const detected = detectMediaType(input.mediaUrl);

    let mimeType = 'image/jpeg';

    if (detected === 'audio') {
      mimeType = 'audio/webm';
    } else if (detected === 'video') {
      mimeType = 'video/mp4';
    } else if (input.mediaUrl.toLowerCase().includes('.png')) {
      mimeType = 'image/png';
    } else if (input.mediaUrl.toLowerCase().includes('.webp')) {
      mimeType = 'image/webp';
    }

    currentUserContent.push({
      media: {
        url: input.mediaUrl,
        contentType: mimeType
      }
    });
  }

  if (currentUserContent.length > 0) {
    messages.push({
      role: 'user',
      content: currentUserContent
    });
  }

  try {
    const { output } = await retry(() =>
      ai.generate({
        model,
        system: systemPrompt,
        messages,
        output: {
          schema: FlowResultSchema
        },
        config: {
          safetySettings: [
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_NONE'
            },
          ]
        }
      })
    );

    if (!output || !Array.isArray(output.replies)) {
      throw new Error('Invalid response');
    }

    const normalizedReplies: FlowReply[] = output.replies
      .map((r: any): FlowReply | null => {
        if (!r || (!r.text && !r.mediaUrl)) {
          return null;
        }

        return {
          text: r.text || '',
          delayMs:
            typeof r.delayMs === 'number' && r.delayMs > 0
              ? r.delayMs
              : 1200,
          mood:
            r.mood ||
            input.girl.currentMood ||
            'Neutral',
          mediaUrl: r.mediaUrl || undefined,
          type: r.mediaUrl
            ? detectMediaType(r.mediaUrl)
            : 'text'
        };
      })
      .filter(
        (r): r is FlowReply => r !== null
      );

    return {
      replies:
        normalizedReplies.length > 0
          ? normalizedReplies.slice(0, MAX_BUBBLES)
          : [
              {
                text: 'Anyway, what was I saying?',
                delayMs: 800,
                mood: input.girl.currentMood,
                type: 'text'
              },
            ],

      newMood:
        output.newMood ||
        input.girl.currentMood,

      inferredUserTone:
        output.inferredUserTone ||
        'unknown',

      topic:
        output.topic ||
        'general',

      xpChange:
        output.xpChange ?? 1,

      newRelationshipStatus:
        output.newRelationshipStatus
    };

  } catch (e) {
    console.error('AI GENERATION FAILED:', e);

    return {
      replies: [
        {
          text: "I'm a little distracted right now. Talk later?",
          delayMs: 900,
          mood: input.girl.currentMood,
          type: 'text'
        },
      ],
      newMood: input.girl.currentMood,
      inferredUserTone: 'unknown',
      topic: 'error',
      xpChange: 0,
    };
  }
}

export { chat as chatSequenceFlow };