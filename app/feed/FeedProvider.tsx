'use client';

import type { FeedPost } from '@/lib/types';
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { getSafeDate, getCanonicalGirlId } from '@/lib/utils';
import { allGirls as staticGirls } from '@/lib/server/girls-data';

interface FeedContextType {
  posts: FeedPost[];
  addPost: (post: FeedPost) => void;
  updatePost: (postId: string, updater: (post: FeedPost) => FeedPost) => void;
  removePost: (postId: string) => void;
  isLoading: boolean;
}

const FeedContext = createContext<FeedContextType | null>(null);

export function FeedProvider({
  children,
  initialPosts = [],
  listen = true,
}: {
  children: ReactNode;
  initialPosts?: FeedPost[];
  listen?: boolean;
}) {
  const firestore = useFirestore();
  const { user } = useUser();

  const postsQuery = useMemoFirebase(() => {
    if (!firestore || !listen) return null;

    return query(
      collection(firestore, 'posts'),
      orderBy('timestamp', 'desc'),
      limit(25)
    );
  }, [firestore, listen]);

  const { data: realtimePosts, isLoading: isCollectionLoading } =
    useCollection<FeedPost>(postsQuery, 'posts', );

  const [localPosts, setPosts] = useState<FeedPost[]>(initialPosts);

  useEffect(() => {
    if (!listen || !realtimePosts) return;

    setPosts((prev) => {
      const map = new Map<string, FeedPost>();
      prev.forEach(p => map.set(p.id, p));

      realtimePosts.forEach(post => {
        let finalAuthor = post.author;
        const currentName = finalAuthor?.name || null;

        // IDENTITY HARDENING: If author is generic, force resolve from static registry
        if (currentName === null || currentName === null || !finalAuthor?.id) {
           const authorIdString = String(post.author?.id || post.authorId || post.actorId || '');
           const canonicalId = getCanonicalGirlId(authorIdString);
           
           if (canonicalId) {
             const registryMatch = staticGirls.find(g => g.id === canonicalId);
             if (registryMatch) {
                finalAuthor = {
                  id: registryMatch.id,
                  name: registryMatch.name,
                  profileImageUrl: registryMatch.media.profileImageUrl,
                  role: 'aigirl',
                  currentMood: 'Neutral',
                  nationality: registryMatch.nationality,
                  promotionTier: registryMatch.promotionTier
                };
             }
           }
        }

        map.set(post.id, {
          ...post,
          author: finalAuthor
        });
      });

      return Array.from(map.values()).sort((a, b) => {
        const aTime = getSafeDate(a.timestamp || a.createdAt)?.getTime() || 0;
        const bTime = getSafeDate(b.timestamp || b.createdAt)?.getTime() || 0;
        return bTime - aTime;
      });
    });
  }, [realtimePosts, listen]);

  const addPost = useCallback((post: FeedPost) => {
    setPosts((prev) => {
      if (prev.some((p) => p.id === post.id)) return prev;
      const next = [post, ...prev];
      return next.sort((a, b) => (getSafeDate(b.timestamp || b.createdAt)?.getTime() || 0) - (getSafeDate(a.timestamp || a.createdAt)?.getTime() || 0));
    });
  }, []);

  const updatePost = useCallback(
    (postId: string, updater: (post: FeedPost) => FeedPost) => {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? updater(p) : p))
      );
    },
    []
  );

  const removePost = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  return (
    <FeedContext.Provider
      value={{
        posts: localPosts,
        addPost,
        updatePost,
        removePost,
        isLoading: listen ? isCollectionLoading : false,
      }}
    >
      {children}
    </FeedContext.Provider>
  );
}

export function useFeed() {
  const context = useContext(FeedContext);
  if (!context) {
    return {
      posts: [],
      addPost: () => {},
      updatePost: () => {},
      removePost: () => {},
      isLoading: false,
    };
  }
  return context;
}
