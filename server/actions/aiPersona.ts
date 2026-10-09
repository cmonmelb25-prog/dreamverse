import { AIGirl } from "@/lib/types";
import { chat } from "@/ai/flows/chat/chat-sequence-flow";
import type { FlowResult } from "@/ai/flows/chat/chat-types";

type RelationshipMemory = any;

/**
 * Server-side helper to get a response from the main chat flow.
 * Uses the static persona + per-user relationship memory.
 */
export async function getAiPersonaResponse(
  girl: AIGirl,
  relationship: RelationshipMemory,
  message: string
): Promise<FlowResult> {

  const payload: any = {
    girl,
    relationship,
    history: [], 
    user: {
      id: "server-interaction",
      name: "Server",
      vipStatus: "non-vip",
    },
    message,
  };

  try {
    const response = await chat(payload, "googleai/gemini-2.5-pro");
    return response as FlowResult;
  } catch (error) {
    console.error("Error getting AI persona response:", error);

    return {
      replies: [
        { text: "Sorry, I'm a bit overwhelmed right now.", delayMs: 1000, mood: "Neutral" }
      ],
      newMood: girl.currentMood || "Neutral",
      inferredUserTone: "unknown",
      topic: "error",
      xpChange: 0,
    };
  }
}
