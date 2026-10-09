'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { collection, query, where, limit } from 'firebase/firestore';

import { LiveStreamCreator } from '@/components/live/LiveStreamCreator';
import { LiveFeed } from '@/components/live/LiveFeed';
import { Loader } from '@/components/ui/loader';
import { ChevronLeft, Plus, Video, Eye, Radio, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubscribePopup } from '@/components/SubscribePopup';
import { useAdminActingAs } from '@/providers/AdminActingAsProvider';
import { getSafeDate, cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { allGirls } from '@/lib/server/girls-data';
import { normalizeAIGirl } from '@/lib/normalizeAIGirl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { getMoodColor } from '@/lib/moods';

/**
 * SOCIAL DISCOVERY HUB (TikTok Style)
 * CONSOLDIDATED: The primary lobby logic lives here.
 * HARDENED: Improved session visibility and admin verification.
 */
export default function LivePageClient() {
  const { user, isVip, isAdmin, isLoading } = useUser();
  const { firestore } = useFirebase();
  const { actingAs, setActingAs } = useAdminActingAs();
  const router = useRouter();

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showVipPopup, setShowVipPopup] = useState(false);
  const [joinedStreamIndex, setJoinedStreamIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const liveQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'live'),
      where('status', '==', 'active'),
      limit(30)
    );
  }, [firestore]);

  const { data: rawStreams, isLoading: isStreamsLoading } = useCollection<any>(
    liveQuery,
    'live'
  );

  const streams = useMemo(() => {
    if (!rawStreams || !mounted) return [];
    const now = Date.now();
    const currentUid = user?.uid?.trim();

    return rawStreams
      .filter((s) => {
        const start = getSafeDate(s?.startedAt ?? s?.timestamp);
        // 🛡️ INITIAL LOAD GUARD: If startTime is null (waiting for serverTimestamp), assume it just started
        const startTime = start ? start.getTime() : now;
        
        const isExpired = (now - startTime > 3600000); // 1 hour safety cutoff
        
        // 🛡️ ADMIN VISIBILITY: Allow admins to see their own live cards to verify visibility
        const isOwnStream = !isAdmin && currentUid && String(s.ownerId).trim() === currentUid;
        
        return !isExpired && !isOwnStream;
      })
      .sort((a, b) => {
        const aTime = getSafeDate(a?.updatedAt ?? a?.startedAt)?.getTime() ?? 0;
        const bTime = getSafeDate(b?.updatedAt ?? b?.startedAt)?.getTime() ?? 0;
        return bTime - aTime;
      });
  }, [rawStreams, mounted, user?.uid, isAdmin]);

  const userIsAlreadyLive = useMemo(() => {
     if (!user?.uid || !rawStreams?.length) return false;
     const currentUid = String(user.uid).trim();
     const now = Date.now();
     
     return rawStreams.some(s => {
        const start = getSafeDate(s?.startedAt ?? s?.timestamp);
        const startTime = start ? start.getTime() : now;
        const isNotExpired = (now - startTime < 3600000);
        return String(s.ownerId).trim() === currentUid && s.status === 'active' && isNotExpired;
     });
  }, [rawStreams, user?.uid]);

  const handleSetActingAs = (girlConfig: any | null) => {
    if (!girlConfig) {
      setActingAs(null);
      return;
    }
    const girlForContext = normalizeAIGirl(girlConfig);
    setActingAs(girlForContext);
  };

  if (isLoading) return <div className="h-dvh flex items-center justify-center bg-black"><Loader /></div>;

  if (isBroadcasting) {
    return <LiveStreamCreator onCloseAction={() => setIsBroadcasting(false)} />;
  }

  if (joinedStreamIndex !== null && streams.length > 0) {
    return (
      <div className="h-dvh bg-black">
         <LiveFeed 
           streams={streams} 
           initialIndex={joinedStreamIndex}
           onExitAction={() => setJoinedStreamIndex(null)} 
         />
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden relative">
      <div className="flex-none p-4 pt-12 md:pt-6 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex justify-between items-center max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full bg-white/5 text-white border border-white/10"
                onClick={() => router.push('/feed')}
              >
                <ChevronLeft />
              </Button>
              <h1 className="font-headline text-2xl tracking-tight text-white uppercase ml-2">Discovery</h1>
            </div>

            <div className="flex items-center gap-2">
               {isAdmin && !userIsAlreadyLive && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-10 px-4 rounded-full bg-black/40 border border-white/10 backdrop-blur-md shadow-lg flex items-center gap-2 transition-transform active:scale-95 outline-none text-white">
                      {actingAs ? (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={actingAs.media.profileImageUrl} className="object-cover object-top" />
                          <AvatarFallback>{actingAs.name[0]}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <Users size={16} />
                      )}
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        {actingAs ? actingAs.name : 'Act As'}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-black/90 backdrop-blur-xl border-white/10 text-white w-56">
                    <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest text-white/40">Resident Identity</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/5" />
                    <ScrollArea className="h-[250px]">
                      <DropdownMenuItem onSelect={() => handleSetActingAs(null)} className="cursor-pointer">Self (User)</DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/5" />
                      {allGirls.map((girl) => (
                        <DropdownMenuItem key={girl.id} onSelect={() => handleSetActingAs(girl)} className="cursor-pointer gap-2">
                          <Avatar className="h-6 w-6"><AvatarImage src={girl.media.profileImageUrl} className="object-cover object-top" /></Avatar>
                          {girl.name}
                        </DropdownMenuItem>
                      ))}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {!userIsAlreadyLive ? (
                <Button
                    onClick={() => {
                      if (isVip || isAdmin) setIsBroadcasting(true);
                      else setShowVipPopup(true);
                    }}
                    className="bg-primary hover:bg-primary/80 text-white rounded-full px-5 h-10 font-black uppercase text-[9px] tracking-widest shadow-[0_0_20px_rgba(255,0,132,0.4)]"
                >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Start Live
                </Button>
              ) : (
                <button
                    onClick={() => setIsBroadcasting(true)}
                    className="bg-red-500/20 hover:bg-red-500/30 transition-colors backdrop-blur-md border border-red-500/40 px-5 h-10 rounded-full flex items-center gap-2 group"
                >
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-400 group-hover:text-white transition-colors">Return to Live</span>
                </button>
              )}
            </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 pb-24 no-scrollbar pt-4">
        <div className="max-w-5xl mx-auto">
          {isStreamsLoading ? (
            <div className="flex justify-center py-20"><Loader /></div>
          ) : streams.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
               {streams.map((stream, index) => {
                 const moodColor = getMoodColor(stream.currentMood as any);
                 const isSelf = user?.uid === stream.ownerId;
                 
                 return (
                   <Card 
                     key={stream.id} 
                     className={cn(
                        "bg-zinc-900/40 border-white/5 overflow-hidden group hover:border-primary/30 transition-all rounded-3xl shadow-2xl relative",
                        isSelf && "ring-2 ring-primary/40 border-primary/20"
                     )}
                     style={{ borderTop: `4px solid ${moodColor}` } as React.CSSProperties}
                   >
                     <div className="relative aspect-[3/4] bg-black">
                       <img 
                         src={stream.photoURL} 
                         alt={stream.displayName} 
                         className="w-full h-full object-cover object-top opacity-90 group-hover:scale-105 transition-transform duration-500" 
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/80" />
                       <div className="absolute top-3 left-3 bg-red-600 px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-lg z-10">
                          <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-white">Live</span>
                       </div>
                       
                       {isSelf && (
                         <div className="absolute top-3 right-3 bg-primary/80 backdrop-blur-sm px-2 py-0.5 rounded-full z-10 border border-white/20">
                           <span className="text-[7px] font-black uppercase text-white">Your Session</span>
                         </div>
                       )}

                       <div className="absolute bottom-3 left-3 right-3 z-10">
                          <h3 className="text-sm font-bold text-white truncate">{stream.displayName}</h3>
                          <p className="text-[10px] text-white/50 truncate mb-2">{stream.title}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-white/40">
                              <Eye size={10} />
                              <span className="text-[9px] font-bold">{stream.viewerCount || 0}</span>
                            </div>
                            <Button 
                              onClick={() => setJoinedStreamIndex(index)}
                              size="sm"
                              className="h-7 px-4 rounded-full bg-white text-black hover:bg-primary hover:text-white font-black uppercase text-[8px] tracking-widest"
                            >
                              Join
                            </Button>
                          </div>
                       </div>
                     </div>
                   </Card>
                 );
               })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-white/20 gap-4">
               <div className="h-24 w-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/5 shadow-2xl">
                  <Video size={48} className="opacity-20" />
               </div>
               <div className="text-center space-y-2">
                  <p className="font-headline text-2xl tracking-tight text-white/40 uppercase">No sessions active</p>
                  <p className="text-[10px] uppercase font-black tracking-[0.3em] opacity-40 px-8">Be the first to broadcast from the observatory</p>
                  <Button 
                    variant="outline" 
                    className="mt-6 border-white/10 text-white/40"
                    onClick={() => {
                        if (isVip || isAdmin) setIsBroadcasting(true);
                        else setShowVipPopup(true);
                    }}
                  >
                    Start My Session
                  </Button>
               </div>
            </div>
          )}
        </div>
      </main>

      <SubscribePopup
        open={showVipPopup}
        onOpenChangeAction={setShowVipPopup}
        feature="Live Streaming"
      />
    </div>
  );
}