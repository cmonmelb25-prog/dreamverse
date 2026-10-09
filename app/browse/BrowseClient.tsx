'use client';

import type { AIGirl, User } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User as UserIcon, MessageSquare, MapPin, Search, X, Phone } from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from '@/firebase/client';
import { Loader } from '@/components/ui/loader';
import { getMoodColor } from '@/lib/moods';
import { TierBadge } from '@/components/tier-badge';
import { safeImageUrl } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FollowButton } from '@/components/profile/FollowButton';
import { allGirls as staticGirls } from '@/lib/server/girls-data';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function BrowseClient({ initialGirls, initialUsers }: { initialGirls: AIGirl[], initialUsers: User[] }) {
  const { user, isLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loadingConvId, setLoadingConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const processedGirls = useMemo(() => initialGirls.map(g => {
    const staticMatch = staticGirls.find(sg => sg.id.toLowerCase() === g.id.toLowerCase());
    return staticMatch ? { ...g, promotionTier: staticMatch.promotionTier } : g;
  }), [initialGirls]);

  const filteredGirls = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return processedGirls;
    return processedGirls.filter(g => 
      g.name.toLowerCase().includes(q) || 
      g.location.toLowerCase().includes(q) ||
      g.nationality.toLowerCase().includes(q)
    );
  }, [processedGirls, searchQuery]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return initialUsers;
    return initialUsers.filter(u => 
      (u.displayName || '').toLowerCase().includes(q) || 
      (u.username || '').toLowerCase().includes(q) ||
      (u.location || '').toLowerCase().includes(q)
    );
  }, [initialUsers, searchQuery]);

  const handleMessageClick = async (profile: any, isGirl: boolean) => {
    if (!user || !firestore) {
      router.push('/auth/signin');
      return;
    }

    if (isGirl) {
      router.push(`/chat/${profile.id}`);
      return;
    }

    const otherUid = (profile.uid || profile.id) as string | null;
    if (!otherUid) return;

    setLoadingConvId(otherUid);
    const conversationId = [user.uid, otherUid].sort().join('_');

    try {
      const chatRef = doc(firestore, "messenger", conversationId);
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        router.push(`/messages/${conversationId}`);
      } else {
        router.push(`/messages/${conversationId}?new=true`);
      }
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: `messenger/${conversationId}`,
        operation: 'get',
      });
      errorEmitter.emit('permission-error', permissionError);
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
        callerName: user.displayName || null,
        callerImage: user.photoURL || null,
        mode: 'voice'
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to start call');
    }

    // ⭐ THIS IS THE MISSING PIECE ⭐

  } catch (e: any) {
    toast({
      variant: 'destructive',
      title: 'Call Error',
      description: e.message
    });
  }


};
  if (isLoading) {
    return (
      <div className="w-full flex justify-center py-10">
        <Loader className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* SEARCH BAR */}
      <div className="max-w-md mx-auto relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
          <Search size={18} />
        </div>
        <Input
          id="browse-search"
          name="q"
          placeholder="Search name, location, or nationality..."
          className="pl-12 h-12 rounded-full bg-card/40 border-white/10 focus:ring-primary shadow-xl text-base"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search Residents and Community"
        />
        {searchQuery && (
          <button 
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <Tabs defaultValue="residents" className="w-full">
        <TabsList className="mb-8 bg-black/20 border border-white/5 p-1 rounded-full h-12 w-full max-w-md mx-auto grid grid-cols-2">
          <TabsTrigger value="residents" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white font-bold uppercase text-[10px] tracking-widest">
            Residents ({filteredGirls.length})
          </TabsTrigger>
          <TabsTrigger value="community" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white font-bold uppercase text-[10px] tracking-widest">
            Community ({filteredUsers.length})
          </TabsTrigger>
        </TabsList>

        {/* RESIDENTS */}
        <TabsContent value="residents" className="mt-0">
          {filteredGirls.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p>No Residents found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredGirls.map((girl, index) => {
                const defaultPlaceholder = `https://picsum.photos/seed/${girl.id}/600/800`;
                const photo = safeImageUrl(girl.media?.profileImageUrl || defaultPlaceholder) || defaultPlaceholder;
                const moodColor = getMoodColor(girl.currentMood as any);

                return (
                  <Card
                    key={girl.id}
                    className="browse-card relative overflow-hidden shadow-2xl group border-white/10 bg-black/60 backdrop-blur-xl"
                    style={{ '--mood-color': moodColor } as React.CSSProperties}
                  >
                    <Link href={`/profile/${girl.id}`} prefetch={false} className="block aspect-[3/4] relative overflow-hidden">
                      <Image
                        src={photo}
                        alt={girl.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        unoptimized={true}
                        priority={index < 4}
                      />
                      <div className="absolute top-2 right-2 z-20">
                        <TierBadge tier={girl.promotionTier} />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-xl font-bold text-white font-headline truncate">{girl.name}</h3>
                        <p className="text-sm text-white/70 truncate">{girl.location}</p>
                      </div>
                    </Link>

                    <CardContent className="p-1.5 border-t border-white/10 grid grid-cols-2 gap-1 bg-black/40">
                      <Button variant="ghost" size="sm" asChild className="flex-col h-11 text-white/90 hover:text-white hover:bg-white/10 p-0 transition-all">
                        <Link href={`/profile/${girl.id}`} prefetch={false}>
                          <UserIcon className="h-4 w-4 mb-0.5" />
                          <span className="text-[10px] font-black uppercase tracking-tight">Profile</span>
                        </Link>
                      </Button>

                      <Button 
                        type="button"
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleMessageClick(girl, true)} 
                        className="flex-col h-11 text-white/90 hover:text-white hover:bg-white/10 p-0 transition-all"
                      >
                        <MessageSquare className="h-4 w-4 mb-0.5" />
                        <span className="text-[10px] font-black uppercase tracking-tight">Message</span>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* COMMUNITY */}
        <TabsContent value="community" className="mt-0">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p>No community members found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredUsers
                .filter(u => u.uid !== user?.uid)
                .map((profile, index) => {
                  const defaultPlaceholder = `https://picsum.photos/seed/user-${profile.uid}/600/800`;
                  const photo = safeImageUrl(profile.photoURL || defaultPlaceholder) || defaultPlaceholder;

                  return (
                    <Card key={profile.uid} className="bg-black/60 backdrop-blur-xl border-white/10 overflow-hidden group hover:border-primary/30 transition-all shadow-2xl">
                      <Link href={`/profile/${profile.uid}`} prefetch={false} className="block relative aspect-square">
                        <Image
                          src={photo}
                          alt={profile.displayName || 'User'}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          unoptimized={true}
                          priority={index < 4}
                        />
                        <div className="absolute top-2 right-2 z-20">
                          <TierBadge tier={profile.vipTier} isAdmin={profile.isAdmin} />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="text-xl font-bold text-white font-headline truncate">{profile.displayName}</h3>
                          <div className="flex items-center gap-1 text-white/60 text-xs mt-1">
                            <MapPin className="h-3 w-3" />
                            <span>{profile.location || 'Unknown'}</span>
                          </div>
                        </div>
                      </Link>

                      <CardContent className="p-4 flex flex-col gap-3 bg-black/20">
                        <div className="flex gap-1.5">
                          <FollowButton targetUserId={profile.uid} className="flex-1 rounded-full h-10" />

                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="rounded-full h-10 w-10 flex-shrink-0"
                            onClick={() => handleMessageClick(profile, false)}
                            disabled={loadingConvId === profile.uid}
                          >
                            {loadingConvId === profile.uid ? <Loader className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                          </Button>

                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="rounded-full h-10 w-10 flex-shrink-0"
                            onClick={() => handleCallClick(profile)}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
