
'use client';

import React from 'react';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useUser } from '@/firebase/auth/use-user';
import { collection, query, orderBy } from '@/firebase/client';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, MessageCircle, Loader, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
}

/**
 * YOUR MATCHES SHEET
 * Displays mutual matches and provides direct messaging access.
 */
export default function MatchesSheet({ open, onOpenChangeAction }: Props) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();

  const matchesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'matches'),
      orderBy('matchedAt', 'desc')
    );
  }, [user, firestore]);

  const { data: matches, isLoading } = useCollection<any>(
    matchesQuery,
    user?.uid ? `users/${user.uid}/matches` : null,
    
  );

  const handleMessage = (targetUserId: string) => {
    if (!user || !targetUserId) return;
    
    // Deterministic chat ID generation
    const chatId = [user.uid, targetUserId].sort().join('_');
    router.push(`/messages/${chatId}`);
    onOpenChangeAction(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChangeAction}>
      <SheetContent side="right" className="bg-black/95 backdrop-blur-xl border-white/10 p-0 w-full sm:max-w-md">
        <SheetHeader className="p-6 border-b border-white/5">
          <SheetTitle className="text-white flex items-center gap-2">
            <Users className="text-primary h-5 w-5" />
            Your Matches
          </SheetTitle>
          <SheetDescription className="text-white/40">
            MATCH! You matched with these members. Don't be shy, say hi!
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center p-20">
              <Loader className="animate-spin text-primary" />
            </div>
          ) : !matches || matches.length === 0 ? (
            <div className="p-12 text-center text-white/20">
              <Users className="mx-auto h-12 w-12 mb-4 opacity-10" />
              <p className="font-bold uppercase text-xs tracking-widest">No matches yet</p>
              <p className="text-[10px] mt-2">The multiverse is vast. Keep looking!</p>
            </div>
          ) : (
            <div className="flex flex-col p-2">
              {matches.map((match) => {
                // 🔥 Safe property resolution: falls back to document ID if userId parameter isn't populated
                const targetId = match.userId || match.id;

                return (
                  <div 
                    key={match.id} 
                    className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer"
                    onClick={() => {
                      if (targetId) {
                        router.push(`/profile/${targetId}`);
                        onOpenChangeAction(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 border border-white/10 group-hover:border-primary transition-colors">
                        <AvatarImage src={match.photoURL || match.avatarUrl} className="object-cover" />
                        <AvatarFallback>{match.displayName?.[0] || 'M'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-white group-hover:text-primary transition-colors">
                          {match.displayName || 'Matched Explorer'}
                        </p>
                        <p className="text-[10px] font-black uppercase text-white/30 tracking-tighter">
                          {match.location || 'DreamVerse'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-10 w-10 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                        onClick={(e) => { 
                          e.stopPropagation(); // Stops the profile card routing click event
                          handleMessage(targetId); 
                        }}
                      >
                        <MessageCircle size={18} />
                      </Button>
                      <ChevronRight size={16} className="text-white/10 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
