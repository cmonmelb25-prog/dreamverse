
'use client';

import React from 'react';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { useUser } from '@/firebase/auth/use-user';
import { collection, query, orderBy } from '@/firebase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, X, Loader } from 'lucide-react';
import { likeUser, dismissReceivedLike } from '@/server/actions/swipe-actions';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  onMatchAction: (user: any) => void;
}

/**
 * LIKES YOU DISCOVERY SHEET
 * Displays users who have swiped right on the current user.
 */
export default function LikesYouSheet({ open, onOpenChangeAction, onMatchAction }: Props) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const likesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'receivedLikes'),
      orderBy('likedAt', 'desc')
    );
  }, [user?.uid, firestore]);

  const { data: likes, isLoading } = useCollection<any>(
    likesQuery,
    user?.uid ? `users/${user.uid}/receivedLikes` : null,
    
  );

  const handleLikeBack = async (likeItem: any) => {
    const targetId = likeItem.userId || likeItem.id;
    
    if (!targetId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Invalid target user ID.' });
      return;
    }

    try {
      const res = await likeUser(targetId);
      if (res.success && res.match) {
        onMatchAction(res.matchedUser);
        onOpenChangeAction(false);
      } else if (res.success) {
        toast({ title: "Liked back!" });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
      }
    } catch (err) {
      console.error('Match connection exception:', err);
      toast({ variant: 'destructive', title: 'Connection Failure' });
    }
  };

  const handleDismiss = async (likeItem: any) => {
    const senderId = likeItem.userId || likeItem.id;
    if (!senderId) return;

    try {
      await dismissReceivedLike(senderId);
      toast({ title: "Like dismissed" });
    } catch (err) {
      console.error('Dismiss error:', err);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChangeAction}>
      <SheetContent side="right" className="bg-black/95 backdrop-blur-xl border-white/10 p-0 w-full sm:max-w-md">
        <SheetHeader className="p-6 border-b border-white/5">
          <SheetTitle className="text-white flex items-center gap-2">
            <Heart className="text-primary h-5 w-5 fill-primary" />
            Likes You
          </SheetTitle>
          <SheetDescription className="text-white/40">
            These members liked you.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center p-20">
              <Loader className="animate-spin text-primary" />
            </div>
          ) : !likes || likes.length === 0 ? (
            <div className="p-12 text-center text-white/20">
              <Heart className="mx-auto h-12 w-12 mb-4 opacity-10" />
              <p className="font-bold uppercase text-xs tracking-widest">No likes yet</p>
              <p className="text-[10px] mt-2">Keep swiping to get noticed!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 p-4">
              {likes.map((like) => (
                <div key={like.id} className="relative group bg-white/5 rounded-2xl overflow-hidden border border-white/5 p-3 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                  <Avatar className="h-20 w-20 border-2 border-white/10 mb-3">
                    <AvatarImage src={like.photoURL || like.avatarUrl} className="object-cover" />
                    <AvatarFallback>{like.displayName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <p className="font-bold text-sm text-white truncate w-full text-center mb-4">{like.displayName || 'Discovery Member'}</p>
                  
                  <div className="flex gap-2 w-full mt-auto">
                    <Button 
                      size="sm" 
                      className="flex-1 rounded-full h-8 bg-primary hover:bg-primary/80 text-[10px] font-black uppercase tracking-tighter"
                      onClick={() => handleLikeBack(like)}
                    >
                      Like Back
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="h-8 w-8 rounded-full p-0 text-white/20 hover:text-red-400 hover:bg-white/5"
                      onClick={() => handleDismiss(like)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
