
'use server';

import { db } from '@/lib/firebase-admin';
import type { User } from '@/lib/types';
import { serializeFirestore } from '@/lib/utils';

export async function getRealUserClient(userId: string): Promise<User | null> {
  if (!db) {
      console.error("Firestore not initialized, cannot get user.");
      return null;
  }
  try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
          return null;
      }
      const data = serializeFirestore({ uid: userId, ...userDoc.data() });
      return data as User;
  } catch (error) {
      console.error("Error fetching user:", error);
      return null;
  }
}
