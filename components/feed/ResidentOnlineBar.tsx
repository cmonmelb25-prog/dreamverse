'use client';

import { useNotifications } from '@/hooks/use-notifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { cn, getCanonicalGirlId, getSafeDate, safeImageUrl } from '@/lib/utils';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { useUser } from '@/firebase/auth/use-user';
import { collection, query, where, limit } from '@/firebase/client';
import { Loader } from '@/components/ui/loader';
import { allGirls as staticGirls } from '@/lib/server/girls-data';
import React, { useMemo, useRef, useState, useEffect } from 'react';

interface ResidentOnlineBarProps {
  className?: string;
  isSidebar?: boolean;
  liveOnly?: boolean;
}

/**
 * High-Performance Active Navigation Bar.
 * OPTIMIZED: Uses strictly memoized queries to prevent listener thrashing.
 */
export function ResidentOnlineBar({ 
  className, 
  isSidebar = false,
  liveOnly = false
}: ResidentOnlineBarProps) {
  const { user: currentUser } = useUser();
  const { notifications } = useNotifications();
  const { firestore } = useFirebase();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  
  const [scrollProgress, setScrollProgress] = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /* -------------------------------------------------------------------------- */
  /* 1. OPTIMIZED READ QUERIES (Snapshot streams)                               */
  /* -------------------------------------------------------------------------- */

  const girlsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'aiGirls'), limit(25));
  }, [firestore]);

  const liveQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'live'), where('status', '==', 'active'), limit(20));
  }, [firestore]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !currentUser?.uid || liveOnly) return null;
    return query(
      collection(firestore, 'users'), 
      where('status', '==', 'online'), 
      limit(20)
    );
  }, [firestore, currentUser?.uid, liveOnly]);

  const { data: girlsData, isLoading: isGirlsLoading } = useCollection<any>(girlsQuery, 'aiGirls', currentUser);
  const { data: liveData, isLoading: isLiveLoading } = useCollection<any>(liveQuery, 'live', currentUser);
  const { data: usersData, isLoading: isUsersLoading } = useCollection<any>(usersQuery, 'users', currentUser);

  const girls = girlsData || [];
  const activeStreams = liveData || [];
  const users = (usersData || []).filter(u => (u.uid || u.id) !== currentUser?.uid);
  
  const liveStreamersMap = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, any>();
    
    activeStreams.forEach(s => {
      const start = getSafeDate(s.startedAt || s.timestamp);
      if (start && (now - start.getTime()) < 3600000) { 
        map.set(String(s.userId || s.ownerId).toLowerCase(), s);
      }
    });
    return map;
  }, [activeStreams]);

  const unreadMessageSenderIds = useMemo(() => new Set(
    notifications
      .filter(n => !n.read && (n.type === 'chat_message' || n.type === 'messenger_message'))
      .map(n => n.senderId?.toLowerCase())
  ), [notifications]);

  /* -------------------------------------------------------------------------- */
  /* 2. DYNAMIC STATE MERGE                                                     */
  /* -------------------------------------------------------------------------- */

  const combinedActive = useMemo(() => {
    if (!mounted) return [];

    const entityMap = new Map<string, any>();

    // Phase 1: AI Residents
    girls.forEach(g => {
        const rawId = g.id || '';
        const canonicalId = getCanonicalGirlId(rawId) || rawId;
        const key = canonicalId.toLowerCase();

        const staticMatch = staticGirls.find(sg => sg.id === canonicalId);
        const stream = liveStreamersMap.get(key);
        const isLive = !!stream;
        const isOnline = g.onlineStatus === 'online';

        if (isLive || isOnline) {
          entityMap.set(key, {
            id: canonicalId,
            name: staticMatch ? staticMatch.name : (g.name || canonicalId),
            image: staticMatch ? staticMatch.media.profileImageUrl : (g.media?.profileImageUrl || ''),
            isGirl: true,
            isOnline: isLive || isOnline,
            isLive,
            unread: unreadMessageSenderIds.has(key),
          });
        }
    });

    // Phase 2: Community Users
    users.forEach(u => {
        const uid = u.uid || u.id;
        if (!uid) return;
        const key = String(uid).toLowerCase();

        if (!entityMap.has(key)) {
          const stream = liveStreamersMap.get(key);
          const isLive = !!stream;

          entityMap.set(key, {
            id: uid,
            name: u.displayName || u.username || 'User',
            image: u.photoURL || u.profileImageUrl,
            isGirl: false,
            isOnline: true,
            isLive,
            unread: unreadMessageSenderIds.has(key),
          });
        }
    });

    // Phase 3: Self-Live
    if (currentUser?.uid) {
       const key = currentUser.uid.toLowerCase();
       const userStream = liveStreamersMap.get(key);
       if (userStream && !entityMap.has(key)) {
          entityMap.set(key, {
             id: currentUser.uid,
             name: 'You',
             image: currentUser.photoURL || '',
             isGirl: false,
             isOnline: true,
             isLive: true,
             unread: false
           });
       }
    }

    let results = Array.from(entityMap.values());
    if (liveOnly) results = results.filter(item => item.isLive);

    return results.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        if (a.unread && !b.unread) return -1;
        if (!a.unread && b.unread) return 1;
        return a.name.localeCompare(b.name);
    });
  }, [girls, users, liveStreamersMap, unreadMessageSenderIds, liveOnly, mounted, currentUser]);

  /* -------------------------------------------------------------------------- */
  /* 3. SCROLL ORCHESTRATION                                                    */
  /* -------------------------------------------------------------------------- */

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el || isSidebar) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setScrollProgress(0);
      setCanScroll(false);
      return;
    }
    setCanScroll(true);
    const progress = (el.scrollLeft / maxScroll) * 100;
    setScrollProgress(progress);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isSidebar) return;
    el.addEventListener('scroll', updateScrollState);
    const obs = new ResizeObserver(updateScrollState);
    obs.observe(el);
    updateScrollState();
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      obs.disconnect();
    };
  }, [combinedActive, isSidebar]);

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    const scroll = scrollRef.current;
    if (!track || !scroll) return;
    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const targetScroll = percentage * (scroll.scrollWidth - scroll.clientWidth);
    scroll.scrollTo({ left: targetScroll, behavior: 'smooth' });
  };

  const isLoading = isGirlsLoading || isLiveLoading || (!!currentUser?.uid && isUsersLoading);

  if (!isLoading && combinedActive.length === 0) return null;

  const renderItem = (entity: any) => {
    const keyPrefix = isSidebar ? 'sidebar' : 'bar';
    const uniqueKey = `${keyPrefix}-${entity.id}-${entity.isGirl ? 'girl' : 'user'}`;

    if (entity.isLive) {
      return (
        <Link 
          key={uniqueKey} 
          href="/live" 
          prefetch={false}
          className={cn(
            "group flex items-center transition-all shrink-0 relative",
            isSidebar ? "w-full p-2 rounded-xl hover:bg-white/5 gap-3" : "flex-col w-16 gap-1"
          )}
        >
          <div className="relative shrink-0">
            <Avatar className={cn(
              "border-2 transition-all duration-300 active:scale-95 bg-background shadow-lg h-14 w-14 border-primary shadow-[0_0_15px_rgba(255,0,132,0.4)]",
              isSidebar && "h-10 w-10"
            )}>
              <AvatarImage src={safeImageUrl(entity.image)} className="object-cover object-top" />
              <AvatarFallback>{entity.name[0]}</AvatarFallback>
            </Avatar>
            <div className="absolute -top-1 -right-1 z-20">
               <div className="bg-primary text-[7px] font-black text-white px-1.5 py-0.5 rounded-full border-2 border-background animate-pulse uppercase">
                  LIVE
               </div>
            </div>
          </div>
          {!isSidebar && <span className="font-bold truncate text-[10px] w-full text-center text-primary">{entity.name === 'You' ? 'You' : entity.name.split(' ')[0]}</span>}
          {isSidebar && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-bold text-sm text-white truncate">{entity.name}</span>
              <span className="text-[10px] font-black uppercase tracking-tighter text-primary animate-pulse">Broadcasting</span>
            </div>
          )}
        </Link>
      );
    }

    let href = `/profile/${entity.id}`;
    if (entity.isGirl) {
      href = `/chat/${entity.id}`;
    } else if (currentUser?.uid) {
      const convId = [currentUser.uid, entity.id].sort().join('_');
      href = `/messages/${convId}`;
    }

    return (
      <Link 
        key={uniqueKey} 
        href={href} 
        prefetch={false}
        className={cn(
          "group flex items-center transition-all shrink-0 relative",
          isSidebar ? "w-full p-2 rounded-xl hover:bg-white/5 gap-3" : "flex-col w-16 gap-1"
        )}
      >
        <div className="relative shrink-0">
          <Avatar className={cn(
            "border-2 transition-all duration-300 active:scale-95 bg-background shadow-lg border-white/10",
            isSidebar ? "h-10 w-10" : "h-14 w-14",
            entity.unread && "border-amber-400 ring-2 ring-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
          )}>
            <AvatarImage src={safeImageUrl(entity.image)} className="object-cover object-top" />
            <AvatarFallback>{entity.name[0]}</AvatarFallback>
          </Avatar>
          
          <div className={cn(
            "absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background shadow-sm z-20 transition-all",
            entity.isOnline ? "bg-green-500 animate-in zoom-in" : "bg-zinc-600"
          )} />

          {entity.unread && (
            <div className="absolute -top-0.5 -left-0.5 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center border-2 border-background animate-bounce z-10 shadow-md">
              <div className="h-1.5 w-1.5 rounded-full bg-white" />
            </div>
          )}
        </div>
        
        {!isSidebar && (
          <span className="font-bold truncate text-[10px] w-full text-center text-white/70 transition-colors group-hover:text-primary">
            {entity.name === 'You' ? 'You' : entity.name.split(' ')[0]}
          </span>
        )}

        {isSidebar && (
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-bold text-sm text-white truncate">
              {entity.name}
            </span>
            <span className="text-[10px] font-black uppercase tracking-tighter text-white/20">
              {entity.isGirl ? 'Resident' : 'Community'}
            </span>
          </div>
        )}
      </Link>
    );
  };

  return (
    <div className={cn("w-full bg-card/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 overflow-hidden shadow-2xl", className)}>
      {!liveOnly && !isSidebar && (
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Online Now ({combinedActive.length})</h3>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader className="h-4 w-4 animate-spin text-primary" /></div>
      ) : isSidebar ? (
        <div className="max-h-[calc(100dvh-280px)] overflow-y-auto space-y-0.5 pr-1 touch-auto no-scrollbar overscroll-contain">
          {combinedActive.map(renderItem)}
        </div>
      ) : (
        <div className="relative">
          <div 
            ref={scrollRef}
            className="w-full flex flex-nowrap gap-5 overflow-x-auto pb-5 touch-pan-x no-scrollbar overscroll-contain scroll-smooth"
          >
            {combinedActive.map(renderItem)}
          </div>
          
          {canScroll && (
            <div 
              ref={trackRef}
              onClick={handleBarClick}
              className="mt-1 h-2.5 w-full bg-white/5 rounded-full overflow-hidden relative cursor-pointer"
            >
              <div 
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-200 shadow-[0_0_10px_rgba(255,0,132,0.8)]" 
                style={{ 
                  width: '33.33%',
                  left: `${(scrollProgress * 0.666)}%` 
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
