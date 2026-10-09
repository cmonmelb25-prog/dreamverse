'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Reel, AuthorSnapshot } from '@/lib/types';
import { Plus, Users, Loader } from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';
import { useUserProfile } from '@/hooks/use-user-profile';
import { allGirls } from '@/lib/server/girls-data';
import { useAdminActingAs } from '@/providers/AdminActingAsProvider';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import CreateReel from './CreateReel';
import ReelComments from './ReelComments';
import { normalizeAIGirl } from '@/lib/normalizeAIGirl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ReelCard from './ReelCard';
import { useReelsContext } from '@/context/ReelsContext';
import { getPlaceholderImage } from '@/lib/placeholder';

export default function ReelsClient() {
  const { user, isAdmin, vipTier: authVipTier } = useUser();
  const { profile, vipTier: profileVipTier } = useUserProfile();
  const { actingAs, setActingAs } = useAdminActingAs();
  const { reels, commentingReel, setCommentingReel } = useReelsContext();

  const [visibleReel, setVisibleReel] = useState(0);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  const handleSetActingAs = (girlConfig: any | null) => {
    if (!girlConfig) {
      setActingAs(null);
      return;
    }
    const girlForContext = normalizeAIGirl(girlConfig);
    setActingAs(girlForContext);
  };

  /**
   * REELS OBSERVER ENGINE
   * Threshold reduced to 0.6 to ensure smoother active-state transitions
   * and prevent "dead" playback states on fast scrolls.
   */
  useEffect(() => {
    if (reels.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = refs.current.indexOf(entry.target as HTMLDivElement);
            if (index !== -1) {
              setVisibleReel(index);
            }
          }
        });
      },
      { 
        threshold: 0.6,
        rootMargin: '0px'
      }
    );

    const currentRefs = refs.current;
    currentRefs.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      currentRefs.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [reels]);

  const actor: AuthorSnapshot | null = useMemo(() => {
    const currentTier = (profile?.vipTier as any) || profileVipTier || authVipTier || 'non-vip';

    if (actingAs) {
      return {
        id: actingAs.id,
        name: actingAs.name,
        profileImageUrl:
          actingAs.media?.profileImageUrl ||
          getPlaceholderImage(actingAs.id),
        role: 'aigirl',
        currentMood: actingAs.currentMood || 'Neutral',
        promotionTier: actingAs.promotionTier,
        nationality: actingAs.nationality || 'American',
        isAdmin: false,
      };
    }
  
    if (user) {
      return {
        id: user.uid,
        name: profile?.displayName || user.displayName || 'You',
        profileImageUrl:
          profile?.photoURL ||
          user.photoURL ||
          getPlaceholderImage(user.uid),
        role: 'user',
        currentMood: 'Neutral',
        promotionTier: currentTier,
        nationality: profile?.nationality || 'American',
        isAdmin: !!isAdmin,
      };
    }
  
    return null;
  }, [actingAs, user, profile, profileVipTier, authVipTier, isAdmin]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black overscroll-none">
      {/* 1. TOP LEFT: ACT AS (ADMIN ONLY) */}
      {isAdmin && (
        <div className="absolute top-4 left-4 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-12 w-12 rounded-full bg-black/40 border border-white/10 backdrop-blur-md shadow-lg flex items-center justify-center transition-transform active:scale-95 outline-none"
              >
                {actingAs ? (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={actor?.profileImageUrl ?? undefined} className="object-cover object-top" />
                    <AvatarFallback>{actor?.name?.charAt(0) ?? 'G'}</AvatarFallback>
                  </Avatar>
                ) : (
                  <Users className="h-5 w-5 text-white" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-black/90 backdrop-blur-xl border-white/10">
              <DropdownMenuLabel>Act As</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-[200px] w-48">
                <DropdownMenuItem onSelect={() => handleSetActingAs(null)}>
                  Clear (Act as Self)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {allGirls.map((girl: any) => (
                  <DropdownMenuItem
                    key={girl.id}
                    onSelect={() => handleSetActingAs(girl)}
                  >
                    {girl.name}
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* CREATE REEL SHEET */}
      <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
        <SheetContent className="flex flex-col p-0 bg-black/95 backdrop-blur-xl border-white/10" side="right">
          <SheetHeader className="p-6 pb-4 border-b border-white/10">
            <SheetTitle className="text-white">Create New Reel</SheetTitle>
            <SheetDescription className="text-white/60">
              Upload a video and create a new reel for yourself or an AI
              girl.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="px-6">
              <CreateReel />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* COMMENT SHEET */}
      <Sheet
        open={!!commentingReel}
        onOpenChange={(open) => !open && setCommentingReel(null)}
      >
        <SheetContent className="flex flex-col bg-black/95 backdrop-blur-xl border-white/10" side="right">
          {commentingReel && (
            <SheetHeader className="px-4 py-4 border-b border-white/10">
              <SheetTitle className="text-white">Comments</SheetTitle>
              <SheetDescription className="line-clamp-2 text-white/60">
                {commentingReel.caption}
              </SheetDescription>
            </SheetHeader>
          )}
          <ReelComments reel={commentingReel as Reel | null} />
        </SheetContent>
      </Sheet>

      {/* REELS FEED - ENFORCED h-dvh SCROLL BOX */}
      <div className="h-dvh w-full snap-y snap-mandatory overflow-y-scroll scroll-smooth no-scrollbar bg-black overscroll-none touch-pan-y">
        {reels.length === 0 ? (
          <div className="h-full w-full snap-start flex flex-col items-center justify-center text-muted-foreground text-center p-4">
            <Loader className="h-8 w-8 animate-spin mb-4 text-primary" />
            <p>Loading the latest reels...</p>
          </div>
        ) : (
          reels.map((reel, index) => (
            <div
              key={reel.id}
              ref={(el) => {
                refs.current[index] = el;
              }}
              className="h-dvh w-full snap-start flex-shrink-0 relative overflow-hidden"
            >
              <ReelCard
                reel={reel}
                isVisible={index === visibleReel}
                actor={actor}
                isGlobalLoading={false}
                onCreateReelAction={() => setIsCreateSheetOpen(true)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
