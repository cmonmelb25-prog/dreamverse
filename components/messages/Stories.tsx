
'use client';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { useFirestore } from '@/firebase/provider';
import { useUser } from '@/firebase/auth/use-user';
import { doc } from '@/firebase/client';
import { useMemo } from 'react';
import { collection, query, where, limit, orderBy } from '@/firebase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User } from '@/lib/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

/**
 * Horizontal Active Thread Bar.
 * Focused exclusively on community members with active chats.
 * Removed placeholder elements for a cleaner messaging experience.
 */
interface MessengerChat {
  id: string;
  participantIds: string[];
}

function StoryItem({ userId, conversationId }: { userId: string; conversationId: string }) {
  const firestore = useFirestore();
  const userDocRef = useMemoFirebase(() => !firestore || !userId ? null : doc(firestore, 'users', userId), [firestore, userId]);
  const { data: user, isLoading } = useDoc<User>(
    userDocRef,
    userId ? `users/${userId}` : null
  );
  
  if (isLoading) return <div className="flex flex-col items-center gap-2 w-20"><Skeleton className="h-16 w-16 rounded-full" /><Skeleton className="h-3 w-12 rounded-full" /></div>;
  if (!user) return null;

  return (
    <Link href={`/messages/${conversationId}`} prefetch={false} className="flex flex-col items-center gap-2 w-20 text-center group">
      <div className="relative">
        <Avatar className="h-16 w-16 border-2 border-primary/30 transition-all group-hover:scale-105 group-active:scale-95 shadow-lg">
          <AvatarImage src={user.photoURL || undefined} className="object-cover object-top" />
          <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
        </Avatar>
        {user.status === 'online' && <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background shadow-md" />}
      </div>
      <p className="text-xs font-bold truncate w-full group-hover:text-primary transition-colors">{user.displayName}</p>
    </Link>
  );
}

export default function Stories() {
  const { user } = useUser();
  const firestore = useFirestore();
  const chatsQuery = useMemoFirebase(() => !user || !firestore ? null : query(collection(firestore, 'messenger'), where('participantIds', 'array-contains', user.uid), orderBy('updatedAt', 'desc'), limit(10)), [user, firestore]);
  const { data: chatsData, isLoading } = useCollection<MessengerChat>(
    chatsQuery,
    user?.uid ? 'messenger' : null,
    
  );
  const chats = chatsData || [];

  const storyData = useMemo(() => {
    if (!user || !chats) return [];
    return chats
      .map((chat) => {
        const otherId = chat.participantIds.find((id) => id !== user.uid);
        const isUser = otherId && otherId.length > 15;
        return otherId && isUser ? { userId: otherId, conversationId: chat.id } : null;
      })
      .filter((d): d is { userId: string; conversationId: string } => !!d);
  }, [user, chats]);

  if (storyData.length === 0 && !isLoading) return null;

  return (
    <div className="px-4 py-4 border-b border-white/5 bg-background/50 backdrop-blur-sm">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4">
          {isLoading && chats.length === 0 ? (
            <div className="flex gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-16 w-16 rounded-full" />
            </div>
          ) : (
            storyData.map((data) => (
              <StoryItem key={data.userId} userId={data.userId} conversationId={data.conversationId} />
            ))
          )}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
