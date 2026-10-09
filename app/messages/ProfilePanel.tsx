'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import type { User } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getRealUserClient } from '@/server/actions/get-real-user-client';

export default function ProfilePanel({ chatId }: { chatId: string }) {
  const { user: currentUser } = useUser();
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ⭐ Extract other user ID from chatId
  useEffect(() => {
    if (!currentUser || !chatId) return;

    const [a, b] = chatId.split('_');
    const otherUserId = a === currentUser.uid ? b : a;

    setIsLoading(true);
    getRealUserClient(otherUserId)
      .then(profile => setOtherUser(profile))
      .finally(() => setIsLoading(false));
  }, [chatId, currentUser]);

  // LOADING STATE
  if (isLoading) {
    return (
      <aside className="
        hidden xl:flex flex-col w-80 
        border-l border-white/10 
        bg-black/10 backdrop-blur-2xl
        items-center justify-center
        shadow-[0_0_25px_rgba(0,198,255,0.25)]
      ">
        <Loader />
      </aside>
    );
  }

  // ERROR STATE
  if (!otherUser) {
    return (
      <aside className="
        hidden xl:flex flex-col w-80 
        border-l border-white/10 
        bg-black/10 backdrop-blur-2xl
        items-center justify-center
        shadow-[0_0_25px_rgba(0,198,255,0.25)]
      ">
        <p className="text-white/60">Could not load profile.</p>
      </aside>
    );
  }

  // MAIN PANEL
  return (
    <aside className="
      hidden xl:flex flex-col w-80 
      border-l border-white/10 
      bg-black/10 backdrop-blur-2xl
      p-6
      shadow-[0_0_25px_rgba(0,198,255,0.25)]
      text-white
    ">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <Avatar className="
            w-24 h-24 
            border-4 
            border-transparent 
            shadow-[0_0_20px_rgba(106,0,244,0.4)]
            bg-gradient-to-br from-[#6A00F4]/40 to-[#00C6FF]/40
          ">
            <AvatarImage src={otherUser.photoURL || undefined} />
            <AvatarFallback className="text-3xl">
              {otherUser.displayName?.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="
            absolute -bottom-1 -right-1 
            w-5 h-5 
            bg-green-500 
            rounded-full 
            border-2 border-black/40
            shadow-[0_0_10px_rgba(0,255,0,0.5)]
          " />
        </div>

        <h3 className="text-xl font-bold mt-4 drop-shadow-[0_0_6px_rgba(106,0,244,0.4)]">
          {otherUser.displayName}
        </h3>

        <p className="text-sm text-white/60">{otherUser.location}</p>

        <div className="flex gap-2 mt-2">
          {otherUser.isVip && (
            <Badge className="
              bg-gradient-to-r from-[#6A00F4] to-[#00C6FF]
              text-white border-none shadow-[0_0_10px_rgba(106,0,244,0.4)]
            ">
              {otherUser.vipTier}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h4 className="font-semibold text-sm text-white/60 mb-2">
          About
        </h4>
        <p className="text-sm text-white/80 leading-relaxed">
          {otherUser.bio || "No bio provided."}
        </p>
      </div>

      <div className="mt-auto pt-6">
        <Button
          variant="outline"
          className="
            w-full 
            border-white/20 
            text-white 
            hover:bg-white/10 
            transition-all
          "
          asChild
        >
          <Link href={`/profile/${otherUser.uid}`}>
            View Full Profile
          </Link>
        </Button>
      </div>
    </aside>
  );
}
