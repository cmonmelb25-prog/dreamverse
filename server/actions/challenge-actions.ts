'use server';

import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Weekly Challenge Tracker
 * Increments the global platform gift count.
 */
export async function incrementWeeklyChallenge(amount: number = 1) {
  if (!db) return;

  const weekId = getCurrentWeekId();
  const challengeRef = db.collection('stats').doc('weekly_challenge');

  try {
    await challengeRef.set({
      [`gifts_${weekId}`]: FieldValue.increment(amount),
      totalGifts: FieldValue.increment(amount),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn("[Challenge] Failed to increment:", err);
  }
}

function getCurrentWeekId() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}_W${weekNumber}`;
}
