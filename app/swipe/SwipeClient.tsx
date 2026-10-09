'use client';

import React, { useState, useCallback } from 'react';
import { PanInfo } from 'framer-motion';
import { User } from '@/lib/types';
import SwipeCard from '@/components/swipe/SwipeCard';
import { Button } from '@/components/ui/button';
import { X, Heart, Undo, Menu, Users, Flame } from 'lucide-react';
import { skipUser, likeUser } from '@/server/actions/swipe-actions';
import MatchPopup from '@/components/MatchPopup';
import { useToast } from '@/hooks/use-toast';
import { BackButton } from '@/components/back-button';
import { useUser } from '@/firebase/auth/use-user';
import { Loader } from '@/components/ui/loader';
import LikesYouSheet from '@/components/swipe/LikesYouSheet';
import MatchesSheet from '@/components/swipe/MatchesSheet';

/**
 * SwipeClient
 * UPDATED: Implements active Matches and Likes You discovery sheets.
 */
const SwipeClient = ({ initialUsers }: { initialUsers: User[] }) => {
  const { user, isLoading } = useUser();
  const { toast } = useToast();

  const [users, setUsers] = useState(initialUsers);
  const [swipedUsers, setSwipedUsers] = useState<User[]>([]);
  const [isSwiping, setIsSwiping] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Discovery Sheets
  const [likesOpen, setLikesOpen] = useState(false);
  const [matchesOpen, setMatchesOpen] = useState(false);

  const activeIndex = users.length - 1;
  const activeUser = users[activeIndex];

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    if (isSwiping || !activeUser) return;

    setIsSwiping(true);
    const swipedUser = activeUser;

    setSwipedUsers((prev) => [...prev, swipedUser]);

    try {
      if (direction === 'right') {
        const result = await likeUser(swipedUser.uid);

        if (result.success && result.match && result.matchedUser) {
          setMatchedUser(result.matchedUser);
        } else if (!result.success) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.error,
          });
        }
      } else {
        await skipUser(swipedUser.uid);
      }

      setUsers((prev) => prev.slice(0, -1));
    } finally {
      setIsSwiping(false);
    }
  }, [activeUser, isSwiping, toast]);

  const undoSwipe = useCallback(() => {
    if (swipedUsers.length === 0) return;

    const last = swipedUsers[swipedUsers.length - 1];

    setUsers((prev) => [...prev, last]);
    setSwipedUsers((prev) => prev.slice(0, -1));
  }, [swipedUsers]);

  const onDragEnd = useCallback((_event: any, info: PanInfo) => {
    const { offset } = info;

    if (Math.abs(offset.x) > 100) {
      handleSwipe(offset.x > 0 ? 'right' : 'left');
    }
  }, [handleSwipe]);

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <Loader />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden flex flex-col bg-background">

      {/* HEADER CONTROLS */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
        <BackButton showText={false} className="bg-black/40 border border-white/10 text-white rounded-full h-10 w-10 p-0" />
      </div>

      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMatchesOpen(true)}
          className="bg-black/40 border border-white/10 text-white rounded-full h-10 w-10"
        >
          <Users size={18} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMenuOpen(true)}
          className="bg-black/40 border border-white/10 text-white rounded-full h-10 w-10"
        >
          <Menu size={18} />
        </Button>
      </div>

      {/* CARD AREA */}
      <div className="flex-1 flex items-center justify-center w-full max-w-md mx-auto px-4">
        {users.length > 0 && activeUser ? (
          <div className="relative w-full h-[65vh]">
            {users.slice(-3).map((u, index) => {
              const isTop = index === users.slice(-3).length - 1;
              return (
                <SwipeCard
                  key={u.uid}
                  user={u}
                  isActive={isTop}
                  onDragEnd={onDragEnd}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center space-y-6 px-10 animate-in fade-in zoom-in duration-700">
            <div className="h-24 w-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto border border-primary/20 shadow-2xl">
                <Flame className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white font-headline">Galaxy Scan Complete</h2>
                <p className="text-white/40 font-medium text-sm mt-2">
                You&apos;ve seen everyone in this sector for now. Try expanding your search or check back later.
                </p>
            </div>

            <Button
              className="animated-border-button h-12 px-10 rounded-full uppercase font-black text-[10px] tracking-widest"
              onClick={() => window.location.reload()}
            >
              Recalibrate Search
            </Button>
          </div>
        )}
      </div>

      {/* ACTION BAR */}
      {users.length > 0 && (
        <div className="flex gap-4 pb-12 justify-center items-center">
          <button 
            onClick={undoSwipe}
            className="h-12 w-12 rounded-full bg-white/5 border border-white/10 text-amber-500 flex items-center justify-center transition-all active:scale-75 disabled:opacity-20"
            disabled={swipedUsers.length === 0}
          >
            <Undo size={22} />
          </button>

          <button 
            onClick={() => handleSwipe('left')}
            className="h-16 w-16 rounded-full bg-white/5 border border-white/10 text-red-500 flex items-center justify-center transition-all active:scale-75 shadow-lg"
          >
            <X size={32} />
          </button>

          <button 
            onClick={() => handleSwipe('right')}
            className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center transition-all active:scale-75 shadow-[0_0_20px_rgba(255,0,132,0.2)]"
          >
            <Heart size={32} className="fill-current" />
          </button>

          <button 
            onClick={() => setLikesOpen(true)}
            className="h-12 w-12 rounded-full bg-white/5 border border-white/10 text-blue-400 flex items-center justify-center transition-all active:scale-75"
          >
            <Heart size={22} />
          </button>
        </div>
      )}

      {/* MATCH POPUP */}
      {matchedUser && (
        <div className="fixed inset-0 z-[200]">
           <MatchPopup
            user={matchedUser}
            onOpenChangeAction={() => setMatchedUser(null)}
          />
        </div>
      )}

      {/* DISCOVERY SHEETS */}
      <LikesYouSheet 
        open={likesOpen} 
        onOpenChangeAction={setLikesOpen} 
        onMatchAction={(matched: React.SetStateAction<User | null>) => setMatchedUser(matched)} 
      />
      <MatchesSheet 
        open={matchesOpen} 
        onOpenChangeAction={setMatchesOpen} 
      />

      {/* SETTINGS MODAL */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center px-4 animate-in fade-in duration-300" onClick={() => setMenuOpen(false)}>
          <div className="w-full max-w-sm rounded-[2.5rem] bg-zinc-950 p-8 space-y-4 shadow-2xl border border-white/5" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-6 font-headline tracking-tight uppercase">Discovery Controls</h2>

            <Button variant="ghost" className="w-full justify-start h-12 rounded-2xl text-white hover:bg-white/5 gap-3" onClick={() => { setMenuOpen(false); setLikesOpen(true); }}>
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center"><Heart className="h-4 w-4 text-primary fill-primary" /></div>
              <span className="font-bold text-sm">People who like you</span>
            </Button>

            <Button variant="ghost" className="w-full justify-start h-12 rounded-2xl text-white hover:bg-white/5 gap-3" onClick={() => { setMenuOpen(false); setMatchesOpen(true); }}>
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center"><Users className="h-4 w-4 text-blue-400" /></div>
              <span className="font-bold text-sm">Mutual Matches</span>
            </Button>

            <div className="pt-4 mt-4 border-t border-white/5">
                <Button
                    variant="outline"
                    className="w-full h-12 rounded-2xl border-white/10 hover:bg-white/5 text-white/40 font-black uppercase text-[10px] tracking-widest"
                    onClick={() => setMenuOpen(false)}
                >
                    Close
                </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwipeClient;