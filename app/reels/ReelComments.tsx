'use client';

import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';

import { collection, query, orderBy } from '@/firebase/client';
import type { Reel, Comment } from '@/lib/types';
import { ReelCommentSection } from '@/app/reels/ReelCommentSection';

export default function ReelComments({ reel }: { reel: Reel | null }) {
  const { firestore } = useFirebase();

  // If reel is missing, bail early
  if (!reel) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Could not load comments for this reel.</p>
      </div>
    );
  }

  // Build Firestore query
  const commentsQuery = useMemoFirebase(() => {
    if (!firestore || !reel.id) return null;

    return query(
      collection(firestore, 'reels', reel.id, 'comments'),
      orderBy('timestamp', 'asc')
    );
  }, [firestore, reel.id]);

  // Stream comments
  const { data: comments, isLoading } = useCollection<Comment>(
    commentsQuery,
    `reels/${reel.id}/comments`
  );

  if (isLoading && !comments) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Loading comments...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <ReelCommentSection
        reel={reel}
        comments={comments || []}
        isLocked={false}
      />
    </div>
  );
}