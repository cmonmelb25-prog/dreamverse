
'use client';

import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { useUser } from '@/firebase/auth/use-user';
import { collection, query, where, limit } from '@/firebase/client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getSafeDate } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { allGirls } from '@/lib/server/girls-data';

interface ResidentChat {
  id: string;
  girlId: string;
  userId: string;
  isTyping?: boolean;
  lastMessage?: {
    text: string;
    timestamp: any;
    sender: string;
  };
  updatedAt: any;
}

function ResidentChatListItem({ chat }: { chat: ResidentChat }) {
  const pathname = usePathname();
  const activeId = pathname.split('/').pop();
  const isActive = activeId === chat.girlId;

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (chat.isTyping) {
      const interval = setInterval(() => setNow(Date.now()), 5000);
      return () => clearInterval(interval);
    }
  }, [chat.isTyping]);

  const updatedAtDate = getSafeDate(chat.updatedAt);
  const isTypingStale = updatedAtDate && (now - updatedAtDate.getTime() > 60000);
  const showTyping = chat.isTyping && !isTypingStale;

  const girl = allGirls.find(g => g.id.toLowerCase() === chat.girlId.toLowerCase());
  if (!girl) return null;

  return (
    <Link 
      href={`/chat/${chat.girlId}`} 
      prefetch={false} 
      className={cn(
        'flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 mx-2 mb-0.5 border border-transparent', 
        isActive ? 'bg-primary/10 shadow-md border-primary/10' : 'hover:bg-zinc-800/30'
      )}
    >
      <div className="relative shrink-0">
        <Avatar className={cn(
          "h-14 w-14 border transition-all",
          isActive ? "border-primary shadow-[0_0_10px_rgba(255,0,132,0.3)]" : "border-white/5"
        )}>
          <AvatarImage src={girl.media.profileImageUrl} className="object-cover object-top" />
          <AvatarFallback>{girl.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-sm" />
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-baseline mb-0.5">
          <p className={cn("font-bold text-[15px] truncate", isActive ? "text-primary" : "text-white/90")}>
            {girl.name}
          </p>
          <div className="text-[10px] text-muted-foreground/60 ml-2 shrink-0 font-black uppercase tracking-tighter">
            <ListItemTimestamp timestamp={chat.updatedAt} />
          </div>
        </div>
        
        <p className={cn(
          "text-[13px] truncate leading-tight",
          isActive ? "text-white/80" : "text-muted-foreground/80",
          showTyping && "text-primary animate-pulse font-bold"
        )}>
          {showTyping ? 'typing...' : (chat.lastMessage?.text || 'Started a conversation')}
        </p>
      </div>
    </Link>
  );
}

function ListItemTimestamp({ timestamp }: { timestamp: any }) {
  const [formatted, setFormatted] = useState('');
  useEffect(() => {
    if (!timestamp) return;
    const date = getSafeDate(timestamp);
    if (!date) return;
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

export default function ResidentChatList() {
  const { user } = useUser();
  const { firestore } = useFirebase();

  const chatsQuery = useMemoFirebase(() => 
    !user || !firestore ? null : 
    query(
      collection(firestore, 'chat'), 
      where('userId', '==', user.uid),
      limit(20) // QUOTA OPTIMIZATION: Reduced from 50 to 20
    ), 
    [user?.uid, firestore]
  );

  const { data: rawChats, isLoading } = useCollection<ResidentChat>(chatsQuery, user ? `resident-inbox-${user.uid}` : null);

  const sortedChats = useMemo(() => {
    if (!rawChats) return [];
    return [...rawChats].sort((a, b) => {
      const dateA = getSafeDate(a.updatedAt);
      const dateB = getSafeDate(b.updatedAt);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime();
    });
  }, [rawChats]);

  if (isLoading) return (
    <div className="p-2 space-y-1">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
  
  if (sortedChats.length === 0) return (
    <div className="p-12 text-center text-muted-foreground">
      <p className="text-sm italic">Your inbox is empty.</p>
      <Link href="/browse" className="text-primary text-xs font-black uppercase tracking-widest mt-4 block hover:underline">
        Find a Resident
      </Link>
    </div>
  );

  return (
    <div className="space-y-0.5 py-2">
      {sortedChats.map((chat) => (
        <ResidentChatListItem key={chat.id} chat={chat} />
      ))}
    </div>
  );
}
