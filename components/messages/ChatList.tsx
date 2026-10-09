'use client';

import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { collection, query, where, doc, limit } from 'firebase/firestore';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getSafeDate, isUidPattern } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/lib/types';
import { ShieldCheck, User as UserIcon } from 'lucide-react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface MessengerChat {
  id: string;
  participantIds: string[];
  lastMessage?: {
    text: string;
    timestamp: any;
    senderId: string;
  };
  updatedAt: any;
}

function ChatListItem({ chat, currentUserId }: { chat: MessengerChat; currentUserId: string }) {
  const firestore = useFirestore();
  const isNoteToSelf = chat.participantIds.length === 1 || (chat.participantIds[0] === chat.participantIds[1]);
  const otherUserId = chat.participantIds.find(id => id !== currentUserId) || currentUserId;
  
  const pathname = usePathname();
  const activeId = pathname.split('/').pop();
  const isActive = activeId === chat.id;

  const userDocRef = useMemoFirebase(() => 
    !firestore || !otherUserId ? null : doc(firestore, 'users', otherUserId), 
    [firestore, otherUserId]
  );
  
  const { data: otherUser, isLoading } = useDoc<User>(
    userDocRef,
    otherUserId ? `users/${otherUserId}` : null
  );

  if (isLoading) return <div className="flex items-center gap-3 p-3 mx-2"><Skeleton className="h-12 w-12 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-2 w-1/2" /></div></div>;
  if (!otherUser) return null;

  // 🛡️ IDENTITY RECOVERY: If name is a UID, force fallback to "Member"
  let displayName = isNoteToSelf ? "Note to Self" : (otherUser.displayName || otherUser.username || "Member");
  if (isUidPattern(displayName)) displayName = "Member";

  return (
    <Link 
      href={`/messages/${chat.id}`} 
      prefetch={false} 
      className={cn(
        'flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 mx-2 mb-1 border border-transparent', 
        isActive ? 'bg-[#2C6BED]/10 border-[#2C6BED]/20 shadow-md' : 'hover:bg-zinc-800/40'
      )}
    >
      <div className="relative shrink-0">
        <Avatar className={cn(
          "h-12 w-12 border transition-all",
          isActive ? "border-[#2C6BED] ring-2 ring-[#2C6BED]/20" : "border-white/5"
        )}>
          {isNoteToSelf ? (
            <div className="bg-[#2C6BED] h-full w-full flex items-center justify-center text-white">
              <UserIcon size={20} />
            </div>
          ) : (
            <>
              <AvatarImage src={otherUser.photoURL || undefined} className="object-cover object-top" />
              <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
            </>
          )}
        </Avatar>
        {!isNoteToSelf && otherUser.status === 'online' && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0d0d0d]" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <p className={cn("font-bold text-sm truncate", isActive ? "text-[#2C6BED]" : "text-white")}>
            {displayName}
          </p>
          <div className="text-[9px] font-black uppercase tracking-tighter text-white/30 ml-2 shrink-0">
            <ListItemTimestamp timestamp={chat.updatedAt} />
          </div>
        </div>
        <p className="text-[13px] text-white/50 truncate leading-tight">
          {chat.lastMessage?.text || 'No messages yet'}
        </p>
      </div>
    </Link>
  );
}

function ListItemTimestamp({ timestamp }: { timestamp: any }) {
  const [formatted, setFormatted] = useState('');
  useEffect(() => {
    const date = getSafeDate(timestamp);
    if (!date) {
      setFormatted('');
      return;
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = diffMs / (1000 * 3600 * 24);
    
    if (diffDays < 1 && now.getDate() === date.getDate()) {
      setFormatted(date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    } else if (diffDays < 7) {
      setFormatted(date.toLocaleDateString([], { weekday: 'short' }));
    } else {
      setFormatted(date.toLocaleDateString([], { month: 'short', day: 'numeric' }));
    }
  }, [timestamp]);
  return <span suppressHydrationWarning>{formatted}</span>;
}

export default function ChatList() {
  const { user } = useUser();
  const firestore = useFirestore();

  const chatsQuery = useMemoFirebase(() => 
    !user || !firestore ? null : 
    query(
      collection(firestore, 'messenger'), 
      where('participantIds', 'array-contains', user.uid),
      limit(20)
    ), 
    [user?.uid, firestore]
  );

 const { data: rawChats, isLoading } = useCollection<MessengerChat>(
  chatsQuery,
  user?.uid ? 'messenger' : null
);

  const chats = useMemo(() => {
    if (!rawChats) return [];
    return [...rawChats].sort((a, b) => {
        const dateA = getSafeDate(a.updatedAt)?.getTime() || 0;
        const dateB = getSafeDate(b.updatedAt)?.getTime() || 0;
        return dateB - dateA;
    });
  }, [rawChats]);

  if (isLoading) return <div className="p-2 space-y-2">{[1, 2, 3].map(i => <div key={i} className="flex items-center gap-3 px-3"><Skeleton className="h-12 w-12 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-2 w-1/2" /></div></div>)}</div>;
  
  // 🛡️ AUTH GUARD: Prevent crash if user is null after loading finishes
  if (!user) return null;

  if (chats.length === 0) return (
    <div className="p-12 text-center text-white/20">
      <div className="mb-4 flex justify-center">
         <ShieldCheck className="h-10 w-10 opacity-10" />
      </div>
      <p className="text-xs font-black uppercase tracking-widest">Secure Messaging</p>
      <Link href="/browse" prefetch={false} className="text-[#2C6BED] text-[10px] font-black uppercase tracking-widest mt-4 block hover:underline">Find Someone</Link>
    </div>
  );

  return (
    <div className="space-y-0.5">
      {chats.map((chat) => (
        <ChatListItem key={chat.id} chat={chat} currentUserId={user.uid} />
      ))}
    </div>
  );
}
