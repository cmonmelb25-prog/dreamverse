import { db } from "@/lib/firebase-admin";
import type { AIGirl } from "@/lib/types";
import type { MoodMessage } from "@/lib/mood-library";

/**
 * Safely loads mood messages from Firestore.
 * Falls back to an empty array if the document is missing or malformed.
 */
export async function getMoodMessagesFromDb(mood: string): Promise<MoodMessage[]> {
  if (!db) return [];

  const normalized = mood.toLowerCase();
  const doc = await db.collection("moods").doc(normalized).get();

  if (!doc.exists) return [];

  const data = doc.data();
  if (!data || !Array.isArray(data.moodMessages)) return [];

  return data.moodMessages as MoodMessage[];
}

/**
 * Picks a mood‑appropriate social post for an AI girl.
 * Prefers "post" channel, falls back to "chat" or "push".
 */
export async function getMoodPostForGirl(girl: AIGirl): Promise<string> {
  const mood = girl.currentMood || "neutral";
  const messages = await getMoodMessagesFromDb(mood);

  let postOptions = messages.filter(
    (m): m is MoodMessage => m.channel === "post"
  );

  if (postOptions.length === 0) {
    postOptions = messages.filter(
      (m): m is MoodMessage => m.channel === "chat" || m.channel === "push"
    );
  }

  if (postOptions.length === 0) {
    return "Just thinking about things...";
  }

  const pick = postOptions[Math.floor(Math.random() * postOptions.length)];
  return pick.text;
}

/**
 * Picks a direct message for a specific user based on the girl's mood.
 * Uses "chat" or "push" channels only.
 */
export async function getDirectMessageForGirlAndUser(params: {
  girl: AIGirl;
  userId: string;
}): Promise<string> {
  const mood = params.girl.currentMood || "neutral";
  const messages = await getMoodMessagesFromDb(mood);

  const options = messages.filter(
    (m): m is MoodMessage => m.channel === "chat" || m.channel === "push"
  );

  if (options.length === 0) {
    return "Hey, just thinking about you. What's up?";
  }

  const pick = options[Math.floor(Math.random() * options.length)];
  return pick.text;
}