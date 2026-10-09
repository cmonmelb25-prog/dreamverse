
'use client';

import type { User } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, MapPin, Phone } from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from '@/firebase/client';
import { Loader } from '@/components/ui/loader';
import { TierBadge } from '@/components/tier-badge';
import { safeImageUrl } from '@/lib/utils';
import { FollowButton } from '@/components/profile/FollowButton';
import { useToast } from '@/hooks/use-toast';

export default function UsersClient({ initialUsers }: { initialUsers: User[] }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loadingConvId, setLoadingConvId] = useState<string | null>(null);

  const handleMessageClick = async (targetUser: User) => {
    if (!user || !firestore) {
      router.push('/auth/signin');
      return;
    }

    setLoadingConvId(targetUser.uid);
    const conversationId = [user.uid, targetUser.uid].sort().join('_');

    try {
      const chatRef = doc(firestore, "messenger", conversationId);
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        router.push(`/messages/${conversationId}`);
      } else {
        router.push(`/messages/${conversationId}?new=true`);
      }
    } catch (error) {
      router.push(`/messages/${conversationId}?new=true`);
    } finally {
      setLoadingConvId(null);
    }
  };

  const handleCallClick = async (targetUser: User) => {
  if (!user) {
    router.push('/auth/signin');
    return;
  }

  try {
    const response = await fetch('/api/messenger/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callerId: user.uid,
        recipientId: targetUser.uid,
        callerName: user.displayName || 'User',
        callerImage: user.photoURL || null,
        mode: 'voice'
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      let errorMessage = data.error || 'Failed to start call';
      throw new Error(errorMessage);
    }

    // ⭐ THIS IS THE MISSING PIECE ⭐
    router.push(`/call/${data.callId}`);

  } catch (e: any) {
    toast({ variant: 'destructive', title: 'Call Error', description: e.message });
  }
};


  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {initialUsers
        .filter(u => u.uid !== user?.uid)
        .map((profile) => {
          const defaultPlaceholder = `https://picsum.photos/seed/${profile.uid}/600/800`;
          const photo = safeImageUrl(profile.photoURL || defaultPlaceholder) || defaultPlaceholder;

          return (
            <Card key={profile.uid} className="bg-card/40 backdrop-blur-md border-white/5 overflow-hidden group hover:border-primary/30 transition-all shadow-xl">
              <Link href={`/profile/${profile.uid}`} className="block relative aspect-square">
                <Image
                  src={photo}
                  alt={profile.displayName || 'User'}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized={true}
                />
                <div className="absolute top-2 right-2 z-20">
                  <TierBadge tier={profile.vipTier} isAdmin={profile.isAdmin} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-xl font-bold text-white font-headline truncate">
                    {profile.displayName}
                  </h3>
                  <div className="flex items-center gap-1 text-white/60 text-xs mt-1">
                    <MapPin className="h-3 w-3" />
                    <span>{profile.location || 'Unknown'}</span>
                  </div>
                </div>
              </Link>

              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex gap-1.5">
                  <FollowButton targetUserId={profile.uid} className="flex-1 rounded-full h-10" />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full h-10 w-10 flex-shrink-0"
                    onClick={() => handleMessageClick(profile)}
                    disabled={loadingConvId === profile.uid}
                  >
                    {loadingConvId === profile.uid ? <Loader className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full h-10 w-10 flex-shrink-0"
                    onClick={() => handleCallClick(profile)}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
                {profile.bio && (
                  <p className="text-xs text-muted-foreground line-clamp-2 italic">
                    "{profile.bio}"
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}
