'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { User } from '@/lib/types';
import Link from 'next/link';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';
import { startMatchDay } from '@/lib/vip-limits';

interface Props {
  user: User | null;
  onOpenChangeAction: (open: boolean) => void;
}

/**
 * Match Maker Popup
 * HARDENED: Implements scrollable content area for mobile accessibility.
 */
const MatchPopup: React.FC<Props> = ({ user, onOpenChangeAction }) => {
  const { user: currentUser } = useUser();
  const { toast } = useToast();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setSelectedImage(currentUser?.photoURL || user.photoURL || null);
  }, [currentUser, user]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setSelectedImage(url);

    // cleanup
    return () => URL.revokeObjectURL(url);
  };

  const handleStart = async () => {
    if (!currentUser || !user) return;

    try {
      await startMatchDay(currentUser.uid, user.uid);

      toast({
        title: 'Match Maker started',
      });

      onOpenChangeAction(false);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Failed',
      });
    }
  };

  if (!user) return null;

  const chatId = [currentUser?.uid, user.uid].filter(Boolean).sort().join('_');

  return (
    <Dialog open={true} onOpenChange={onOpenChangeAction}>
      <DialogContent className="sm:max-w-md text-center max-h-[90dvh] overflow-hidden flex flex-col p-0">

        <div className="flex-none p-6 pb-2">
          <DialogHeader>
            <DialogTitle>It's a Match!</DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 overscroll-contain">
          <div className="flex justify-center gap-4 shrink-0">
            <Avatar className="h-20 w-20 border-2 border-primary shadow-lg">
              <AvatarImage src={currentUser?.photoURL || ''} className="object-cover" />
            </Avatar>

            <Avatar className="h-20 w-20 border-2 border-primary shadow-lg">
              <AvatarImage src={user.photoURL || ''} className="object-cover" />
            </Avatar>
          </div>

          <div className="space-y-4">
            <Button onClick={() => fileRef.current?.click()} variant="outline" className="w-full h-12 rounded-xl">
              Choose Match Photo
            </Button>

            <input
              ref={fileRef}
              type="file"
              hidden
              onChange={handleFile}
              accept="image/*"
            />

            {selectedImage && (
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                <img
                  src={selectedImage}
                  className="w-full h-full object-cover"
                  alt="Selected match preview"
                />
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            Customize how you appear in your match profile. This image will be shared with {user.displayName}.
          </p>
        </div>

        <div className="flex-none p-6 pt-4 space-y-2 bg-background/50 backdrop-blur-md border-t border-white/5">
          <Button onClick={handleStart} className="w-full animated-border-button h-12 rounded-xl">
            Start Match Maker
          </Button>

          <Button asChild variant="secondary" disabled={!chatId} className="w-full h-12 rounded-xl">
            <Link href={chatId ? `/messages/${chatId}` : '#'}>
              Send a Message
            </Link>
          </Button>

          <Button variant="ghost" onClick={() => onOpenChangeAction(false)} className="w-full text-white/40">
            Keep Swiping
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default MatchPopup;