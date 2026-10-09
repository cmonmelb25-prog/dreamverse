'use server';

import { db } from '@/lib/firebase-admin';
import { nuclearSerialize } from '@/lib/utils';
import type { User, StaticGirlConfig } from '@/lib/types';
import { normalizeAIGirl } from '@/lib/normalizeAIGirl';
import { allGirls } from '@/lib/server/girls-data';

/**
 * Returns all Residents for browse/lists.
 * OPTIMIZED: Prioritizes static data and only reads dynamic fields from Firestore.
 */
export async function getAllGirls(): Promise<any[]> {
  const baseGirls = allGirls.map((g) => normalizeAIGirl(g));
  if (!db) return nuclearSerialize(baseGirls);

  try {
    // ⚡ PERFORMANCE: Only select dynamic status fields from Firestore
    const snapshot = await db.collection("aiGirls")
      .select("onlineStatus", "currentMood", "promotionTier", "relationshipStatus", "relationshipTargetId", "xp")
      .get();
    
    if (snapshot.empty) return nuclearSerialize(baseGirls);

    const dynamicMap = new Map<string, any>();
    snapshot.docs.forEach((doc) => {
      dynamicMap.set(doc.id.toLowerCase(), doc.data());
    });

    const merged = baseGirls.map((staticGirl) => {
      const dynamic = dynamicMap.get(staticGirl.id.toLowerCase());
      if (!dynamic) return staticGirl;

      // Merge only the dynamic behavioral fields
      return {
        ...staticGirl,
        ...dynamic,
      };
    });

    return nuclearSerialize(merged);
  } catch (error) {
    return nuclearSerialize(baseGirls);
  }
}

/**
 * Fetches all community users.
 */
export async function getAllUsers(): Promise<User[]> {
  if (!db) return [];
  try {
    const snapshot = await db.collection("users").limit(30).get();
    if (snapshot.empty) return [];
    
    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      return { uid: doc.id, ...data } as User;
    });

    return nuclearSerialize(users) as User[];
  } catch (error) {
    return [];
  }
}

/**
 * Updates a Resident's online status.
 */
export async function updateGirlStatus(
  girlId: string,
  status: "online" | "offline"
) {
  if (!db) return { success: false, error: 'Database service unavailable.' };
  
  try {
    await db.collection('aiGirls').doc(girlId).set({ 
      onlineStatus: status,
      updatedAt: Date.now()
    }, { merge: true });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
