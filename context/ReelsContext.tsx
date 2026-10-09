'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import type { Reel } from '@/lib/types';

interface ReelsContextType {
  reels: Reel[];
  setReels: React.Dispatch<React.SetStateAction<Reel[]>>;
  deleteReel: (reelId: string) => void;
  updateReelCommentCount: (reelId: string, delta: number) => void;
  commentingReel: Reel | null;
  setCommentingReel: React.Dispatch<React.SetStateAction<Reel | null>>;
}

const ReelsContext = createContext<ReelsContextType | null>(null);

export function ReelsProvider({
  children,
  initialReels,
}: {
  children: ReactNode;
  initialReels: Reel[];
}) {
  const [reels, setReels] = useState<Reel[]>(initialReels);
  const [commentingReel, setCommentingReel] = useState<Reel | null>(null);

  // Remove a reel from local state
  const deleteReel = useCallback((reelId: string) => {
    setReels((prev) => prev.filter((r) => r.id !== reelId));
  }, []);

  // Update comment count locally for immediate feedback
  const updateReelCommentCount = useCallback((reelId: string, delta: number) => {
    setReels((prev) => prev.map(r => 
      r.id === reelId ? { ...r, commentCount: (r.commentCount || 0) + delta } : r
    ));
  }, []);

  return (
    <ReelsContext.Provider
      value={{
        reels,
        setReels,
        deleteReel,
        updateReelCommentCount,
        commentingReel,
        setCommentingReel,
      }}
    >
      {children}
    </ReelsContext.Provider>
  );
}

export function useReelsContext() {
  const ctx = useContext(ReelsContext);
  if (!ctx) {
    throw new Error('useReelsContext must be used within a ReelsProvider');
  }
  return ctx;
}
