
import { getAllUsers } from '@/server/actions/ai';
import SwipeClient from './SwipeClient';
import { getAuthenticatedUserId } from '@/server/actions/swipe-actions';
import type { User } from '@/lib/types';
import { db } from '@/lib/firebase-admin';

async function getSwipedUserIds(userId: string): Promise<string[]> {
    if (!db) return [];
    const likesSnap = await db.collection('users').doc(userId).collection('likes').get();
    const skipsSnap = await db.collection('users').doc(userId).collection('skips').get();

    const likedIds = likesSnap.docs.map((doc: { id: any; }) => doc.id);
    const skippedIds = skipsSnap.docs.map((doc: { id: any; }) => doc.id);

    return [...likedIds, ...skippedIds];
}

export default async function SwipePage() {
  const allUsers = await getAllUsers();
  const currentUserId = await getAuthenticatedUserId();
  
  let usersToSwipe: User[] = [];

  if (currentUserId) {
    const swipedIds = await getSwipedUserIds(currentUserId);
    const swipedIdSet = new Set(swipedIds);
    // Filter out the current user and anyone they've already swiped on
    usersToSwipe = allUsers.filter(user => user.uid !== currentUserId && !swipedIdSet.has(user.uid));
  } else {
    // For unauthenticated users, just show everyone (they can't swipe anyway)
    usersToSwipe = allUsers;
  }
  
  return (
    <div className="theme-match h-screen w-screen overflow-hidden">
      <SwipeClient initialUsers={usersToSwipe} />
    </div>
  );
}
