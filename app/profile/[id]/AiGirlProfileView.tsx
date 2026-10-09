'use client';

import React, { useMemo, useState, useEffect } from 'react';
import type { AIGirl, FeedPost, Reel, RelationshipMemory, AuthorSnapshot, Track } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MessageSquare, 
  MapPin, 
  Sparkles, 
  Heart, 
  Film, 
  LayoutGrid, 
  Info,
  Send,
  UserCheck,
  Check,
  Share2,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { RelationshipBar } from '@/components/profile/relationship-bar';
import { cn, safeImageUrl, isVideoUrl, normalizeMediaUrl, hardenAuthor } from '@/lib/utils';
import { PartnerName } from '@/components/profile/PartnerName';
import { TierBadge } from '@/components/tier-badge';
import { getMoodColor, MoodName } from '@/lib/moods';
import { useUser } from '@/firebase/auth/use-user';
import { useFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { doc } from 'firebase/firestore';
import { FeedProvider } from '@/app/feed/FeedProvider';
import { normalizeRelationship } from '@/lib/normalizeRelationship';
import PostCard from '@/app/feed/PostCard';
import { Textarea } from '@/components/ui/textarea';
import { createPostAction } from '@/server/actions/create-post';
import { useToast } from '@/hooks/use-toast';
import { VipGallery } from '@/components/profile/VipGallery';
import { ProfileVideos } from '@/components/profile/ProfileVideos';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SafeInitial } from '@/components/safe-initial';
import { FollowButton } from '@/components/profile/FollowButton';
import { MySpaceMusicPlayer } from '@/components/profile/MySpaceMusicPlayer';
import { MySpacePlaylist } from '@/components/profile/MySpacePlaylist';
import styles from '@/components/profile/profile-page.module.css';
import { useRouter } from 'next/navigation';

function CreatePostOnWall({ targetUserId, onPostCreated }: { targetUserId: string, onPostCreated: (post: any) => void }) {
    const { user } = useUser();
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !content) return;
        setIsSubmitting(true);
        try {
            const result = await createPostAction({ authorId: user.uid, content, targetUserId, actingAsId: null });
            if (result.success && result.post) {
                setContent(''); 
                onPostCreated(result.post);
                toast({ title: 'Posted to wall!' });
            } else throw new Error(result.error || 'Failed to post.');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="bg-black/40 border border-white/5 rounded-3xl p-5 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex items-center gap-2 mb-2 px-1">
                   <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Write on Wall</span>
                </div>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Leave a message..." className="bg-black/20 border-white/10 min-h-[80px] rounded-2xl text-sm" disabled={isSubmitting} />
                <div className="flex justify-end pt-1">
                  <button type="submit" className="h-8 px-5 rounded-full animated-border-button text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-50" disabled={isSubmitting}>
                    {isSubmitting ? '...' : 'Post'}
                  </button>
                </div>
            </form>
        </div>
    );
}

export default function AiGirlProfileView({
  girl: initialGirl,
  authoredContent,
  wallPosts = [],
}: {
  girl: AIGirl;
  authoredContent: (FeedPost | Reel)[];
  wallPosts?: FeedPost[];
}) {
  const { user: currentUser } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [localWallPosts, setLocalWallPosts] = useState<FeedPost[]>(wallPosts);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => setMounted(true), []);

  const girlId = initialGirl.id;
  const girlRef = useMemoFirebase(() => (!firestore || !girlId) ? null : doc(firestore, 'aiGirls', girlId), [firestore, girlId]);
  const { data: liveGirl } = useDoc<AIGirl>(girlRef, girlId ? `aiGirls/${girlId}` : null);
  
  const relRef = useMemoFirebase(() => (!firestore || !currentUser?.uid || !girlId) ? null : doc(firestore, 'users', currentUser.uid, 'relationships', girlId), [firestore, currentUser?.uid, girlId]);
  const { data: relRaw } = useDoc<any>(relRef, (currentUser?.uid && girlId) ? `users/${currentUser.uid}/relationships/${girlId}` : null);
  
  const userRelationship: RelationshipMemory | null = useMemo(() => relRaw ? normalizeRelationship(relRaw) : null, [relRaw]);

  const girl: AIGirl = useMemo(() => {
    const merged = { 
      ...initialGirl,
      currentMood: liveGirl?.currentMood || initialGirl.currentMood,
      onlineStatus: liveGirl?.onlineStatus || initialGirl.onlineStatus,
      relationshipStatus: liveGirl?.relationshipStatus || initialGirl.relationshipStatus,
      relationshipTargetId: liveGirl?.relationshipTargetId || initialGirl.relationshipTargetId,
      xp: liveGirl?.xp || initialGirl.xp,
      playlist: liveGirl?.playlist || initialGirl.playlist || []
    };
    if (liveGirl?.media) {
       merged.media = { ...initialGirl.media, imageGallery: liveGirl.media.imageGallery || initialGirl.media.imageGallery, exclusiveGallery: liveGirl.media.exclusiveGallery || initialGirl.media.exclusiveGallery };
    }
    return { ...merged, relationship: userRelationship || initialGirl.relationship } as AIGirl;
  }, [initialGirl, liveGirl, userRelationship]);

  const moodColor = getMoodColor(girl.currentMood as MoodName | undefined);
  const profileUrl = normalizeMediaUrl(girl.media.profileImageUrl);
  const coverUrl = normalizeMediaUrl(girl.media.coverPhotoUrl) || 'https://i.imgur.com/nH9DZFQ.png';
  
  const photosOnly = useMemo(() => (girl.media?.imageGallery || []).filter((url: string) => !isVideoUrl(url)), [girl.media?.imageGallery]);
  const videosOnly = useMemo(() => (girl.media?.imageGallery || []).filter((url: string) => isVideoUrl(url)), [girl.media?.imageGallery]);

  const hydratedAuthoredContent = useMemo(() => {
    const profileAuthor: AuthorSnapshot = { 
      id: girl.id, 
      name: girl.name, 
      profileImageUrl: profileUrl, 
      role: 'aigirl', 
      nationality: girl.nationality, 
      promotionTier: girl.promotionTier,
      currentMood: girl.currentMood
    };
    return authoredContent.map((item: any) => { 
      if ('author' in item) { 
        return { ...item, author: hardenAuthor({ ...item.author, ...profileAuthor }) }; 
      } 
      return item; 
    });
  }, [authoredContent, girl.id, girl.name, profileUrl, girl.nationality, girl.promotionTier, girl.currentMood]);

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({ title: 'Profile link copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const sidebarBlocks = [
    <Card key="identity" className="overflow-hidden bg-card/60 backdrop-blur-md border-white/10 shadow-2xl rounded-[2.5rem]" style={{ borderLeft: `8px solid ${moodColor}` } as React.CSSProperties}>
      <div className="relative aspect-square">
        <Image src={profileUrl} alt={girl.name} fill className="object-cover object-top" unoptimized priority />
        <div className="absolute top-4 right-4"><TierBadge tier={girl.promotionTier} /></div>
      </div>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-1 mb-2">
          <h1 className="text-4xl font-bold font-headline text-white">{girl.name}, {girl.age}</h1>
          <div className="flex items-center gap-1.5 text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-black uppercase tracking-widest">{girl.location}</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
           <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] font-black uppercase text-white/40">Status</span>
              <span className="text-xs font-bold text-primary truncate flex items-center gap-1">
                {girl.relationshipStatus?.includes('dating') ? (
                  <>Dating <PartnerName partnerId={girl.relationshipTargetId || ''} /></>
                ) : (girl.relationshipStatus || 'Single')}
              </span>
          </div>
          <div className="flex gap-2">
             <Button asChild className="flex-1 h-12 rounded-2xl animated-border-button shadow-lg">
                <Link href={`/chat/${girl.id}`}>
                  <MessageSquare className="mr-2 h-5 w-5" />
                  <span className="font-black uppercase tracking-widest text-[10px]">Message</span>
                </Link>
             </Button>
             <FollowButton targetUserId={girl.id} className="h-12 rounded-2xl px-6" />
          </div>
        </div>
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Sync Progress</h3>
          </div>
          <RelationshipBar girlId={girl.id} />
        </div>
      </CardContent>
    </Card>,
    <div key="bio" className="bg-black/20 rounded-[2.5rem] p-6 border border-white/5 shadow-xl">
      <div className="flex items-center gap-2 mb-3">
         <Info size={14} className="text-primary" />
         <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Backstory</span>
      </div>
      <p className="text-sm text-white/80 leading-relaxed italic">{girl.bio}</p>
    </div>,
    photosOnly.length > 0 && (
      <div key="photos" className="bg-card/40 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-6 px-1">
          <LayoutGrid className="h-4 w-4 text-primary" />
          <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40">Images</h2>
        </div>
        <VipGallery images={photosOnly} isVIP={true} layout="pile" />
      </div>
    ),
    videosOnly.length > 0 && (
      <div key="videos" className="bg-card/40 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-6 px-1">
          <Film className="h-4 w-4 text-primary" />
          <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40">Videos</h2>
        </div>
        <ProfileVideos videos={videosOnly} />
      </div>
    ),
    <MySpaceMusicPlayer key="player" />,
    <MySpacePlaylist key="playlist" profileId={girl.id} initialPlaylist={girl.playlist} />,
    <CreatePostOnWall key="wall" targetUserId={girl.id} onPostCreated={(p) => setLocalWallPosts(prev => [p, ...prev])} />
  ].filter(Boolean);

  const timelineContent = (
    <div className="space-y-6">
       <div className="flex items-center gap-3 px-4 mb-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40">Timeline Feed</h2>
       </div>
       {hydratedAuthoredContent.length > 0 || localWallPosts.length > 0 ? (
          <>
            {hydratedAuthoredContent.map((item: any, idx: number) => 'content' in item ? <PostCard key={item.id || idx} post={item as FeedPost} /> : null)}
            {localWallPosts.map((post: FeedPost) => <PostCard key={post.id} post={post} />)}
          </>
        ) : (
          <div className="text-center p-24 bg-card/20 rounded-[3rem] border border-dashed border-white/10">
            <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">No transmissions logged</p>
          </div>
        )}
    </div>
  );

  if (!mounted) return null;

  const activeLayout = girl.theme?.layout || 'classic';

  return (
    <FeedProvider initialPosts={hydratedAuthoredContent.filter((item: any) => 'content' in item) as FeedPost[]} listen={false}>
      <div className={cn(styles.root, "relative min-h-dvh w-full bg-background overflow-x-hidden")}>
        
        <div className={cn(styles.coverWrapper, styles[`border-${girl.theme?.borderStyle || 'rounded'}`])}>
           <div className="absolute top-12 left-6 z-50">
              <button 
                onClick={() => router.back()}
                className="bg-black/40 text-white rounded-full h-10 px-6 backdrop-blur-md font-black uppercase text-[10px] flex items-center shadow-2xl border border-white/5 hover:bg-black/60 transition-all"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </button>
           </div>
           <div className="absolute top-12 right-6 z-50">
              <button 
                onClick={handleShare}
                className="bg-black/40 text-white rounded-full h-10 px-6 backdrop-blur-md font-black uppercase text-[10px] flex items-center shadow-2xl border border-white/5 hover:bg-black/60 transition-all"
              >
                {copied ? <Check className="h-4 w-4 mr-2 text-green-400" /> : <Share2 className="h-4 w-4 mr-2" />} 
                Share
              </button>
           </div>
           
           {coverUrl ? (
              isVideoUrl(coverUrl) ? <video src={coverUrl} autoPlay muted loop playsInline className={styles.coverImage} crossOrigin="anonymous" /> : <img src={coverUrl} className={styles.coverImage} alt="Cover" />
           ) : <div className="w-full h-full bg-zinc-950" />}
           <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className={styles.page}>
          <div className={cn(styles.layoutContent, styles[`layout-${activeLayout}`])}>
            {activeLayout === 'single-column' ? (
              <div className="flex flex-col gap-12 max-w-2xl mx-auto w-full">
                 <div className="space-y-6">{sidebarBlocks}</div>
                 <main className={styles.main}>{timelineContent}</main>
              </div>
            ) : activeLayout === 'reverse-sidebar' ? (
              <>
                 <main className={styles.main}>{sidebarBlocks}</main>
                 <aside className={styles.sidebar}>{timelineContent}</aside>
              </>
            ) : activeLayout === 'zig-zag' ? (
              <div className="flex flex-col gap-16 max-w-5xl mx-auto w-full">
                 {sidebarBlocks.map((block, idx) => (
                    <div key={idx} className={cn("flex flex-col md:flex-row items-center gap-12", idx % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse")}>
                       <div className="w-full md:w-1/2">{block}</div>
                       <div className="hidden md:block w-1/2 opacity-20">
                          <div className="h-40 border-2 border-dashed border-white/10 rounded-[3rem] flex items-center justify-center font-black uppercase text-[10px] tracking-widest">Atmosphere Segment {idx + 1}</div>
                       </div>
                    </div>
                 ))}
                 <div className="w-full">{timelineContent}</div>
              </div>
            ) : (
              <>
                <aside className={styles.sidebar}><div className="space-y-6">{sidebarBlocks}</div></aside>
                <main className={styles.main}>{timelineContent}</main>
              </>
            )}
          </div>
        </div>
      </div>
    </FeedProvider>
  );
}
