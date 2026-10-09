
'use server';

import { db as adminDb } from '@/lib/firebase-admin';
import type { Relationship as RelationshipType } from '@/lib/types';
import { initializeRelationship } from '@/lib/relationships';
import { normalizeRelationship } from '@/lib/normalizeRelationship';
import { db } from '@/lib/firebase-admin';
import type { Relationship } from '@/lib/types';
import { serializeFirestore } from '@/lib/utils';

/**
 * Saves a fully normalized Relationship object to Firestore.
 * This is used by the emotional engine, XP updates, tone tracking,
 */
export async function saveRelationship(
  userId: string,
  girlId: string,
  relationship: Relationship
) {
  if (!db) {
    console.error("Firestore not initialized — cannot save relationship.");
    return;
  }

  const ref = db
    .collection('users')
    .doc(userId)
    .collection('relationships')
    .doc(girlId);

  // Firestore-safe serialization
  const clean = JSON.parse(JSON.stringify(relationship));

  await ref.set(clean, { merge: true });
}
/* ========================================================= */
/* GET OR INITIALIZE RELATIONSHIP                            */
/* ========================================================= */
export async function getOrInitializeRelationship(
  userId: string,
  girlId: string
): Promise<RelationshipType> {
  const firestore = adminDb;
  if (!firestore) {
    console.error("Firestore not initialized, returning new relationship object.");
    return initializeRelationship();
  }

  const docRef = firestore
    .collection('users')
    .doc(userId)
    .collection('relationships')
    .doc(girlId);

  const snap = await docRef.get();

  // --- Create new relationship if missing ---
  if (!snap.exists) {
    const base = initializeRelationship();
    await docRef.set(base);
    return base;
  }

  // --- Sanitize & migrate legacy data ---
  const rawData = snap.data() as any;
  let needsUpdate = false;

  // Ensure relationshipStats exists
  if (!rawData.relationshipStats) {
    rawData.relationshipStats = { xp: 0, confidence: 0, interest: 0 };
    needsUpdate = true;
  }

  // Determine best XP
  let bestXp = rawData.relationshipStats.xp ?? rawData.xp ?? 0;
  if (bestXp < 0) bestXp = 0;
  if (typeof rawData.xp === 'number' && rawData.xp > bestXp) {
    bestXp = rawData.xp;
  }

  // Sync XP fields
  if (rawData.relationshipStats.xp !== bestXp || rawData.xp !== bestXp) {
    rawData.relationshipStats.xp = bestXp;
    rawData.xp = bestXp;
    needsUpdate = true;
  }

  // Write back if needed
  if (needsUpdate) {
    await docRef.set(rawData, { merge: true });
  }

  // Normalize before returning (Ensure serialization for server-side logic)
  return normalizeRelationship(serializeFirestore(rawData));
}
