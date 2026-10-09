'use server';

import { NextResponse } from 'next/server';
import { db } from "@/lib/firebase-admin";
import { MoodMessage, moodSequences } from "@/lib/mood-library";

export async function resolveMood(mood: string): Promise<{
  name: string;
  color: string;
  messages: MoodMessage[];
  cooldown?: number;
  escalateTo?: string;
}> {
  const moodName = mood || "Neutral";

  const fallback = moodSequences[moodName] || moodSequences["Neutral"];

  if (!db) {
    console.error("Firestore not initialized in resolveMood()");
    return {
      name: moodName,
      color: "#777",
      messages: fallback.messages ?? [],
      cooldown: fallback.cooldown,
      escalateTo: fallback.escalateTo,
    };
  }

  const firestoreDoc = await db
    .collection("moods")
    .doc(moodName.toLowerCase())
    .get();

  const firestoreData = firestoreDoc.exists ? firestoreDoc.data() : {};

  return {
    name: moodName,
    color: firestoreData?.color ?? "#777",
    messages:
      (firestoreData?.moodMessages as MoodMessage[]) ??
      fallback.messages ??
      [],
    cooldown: fallback.cooldown,
    escalateTo: fallback.escalateTo,
  };
}