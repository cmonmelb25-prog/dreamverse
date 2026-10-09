'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { ProfileTheme } from '@/lib/themeTypes';
import type { FeedPost, Reel, AuthorSnapshot, Track } from '@/lib/types';
import { cn, isVideoUrl, isUidPattern, normalizeMediaUrl, safeImageUrl, hardenAuthor } from '@/lib/utils';
import { VipGallery } from './VipGallery';
import { ProfileVideos } from './ProfileVideos'; 
import { useUser } from '@/firebase/auth/use-user';
import { Button } from '../ui/button';
import {
  Check,
  MessageSquare,
  Share2,
  MapPin,
  UserCog,
  LayoutGrid,
  Film,
  Info,
  Clock,
  Send,
  ChevronLeft,
  Phone,
  Video
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PostCard from '@/app/feed/PostCard';
import { FeedProvider } from '@/app/feed/FeedProvider';
import { TierBadge } from '@/components/tier-badge';
import { FollowButton } from './FollowButton';
import { PartnerName } from './PartnerName';
import styles from './profile-page.module.css';
import { normalizeTheme } from '@/lib/normalizeTheme';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SafeInitial } from '@/components/safe-initial';
import { MySpaceMusicPlayer } from './MySpaceMusicPlayer';
import { MySpacePlaylist } from './MySpacePlaylist';
import { createPostAction } from '@/server/actions/create-post';
import { Textarea } from '@/components/ui/textarea';
import { initiateMessengerCallAction } from '@/server/actions/messenger-calls';

interface ProfilePageProps {
  profileId: string;
  username: string;
  displayName: string;
  isVip: boolean;
  isAdmin: boolean;
  bio: string;
  theme: any;
  images?: string[];
  videos?: string[];
  authoredContent?: (FeedPost | Reel)[];
  wallPosts?: FeedPost[];
  relationshipStatus?: string;
  relationshipTargetId?: string | null;
  partnerIds?: string[];
  location?: string;
  avatarUrl?: string;
  coverUrl?: string;
  role?: string;
  age?: number;
  nationality?: string;
  playlist?: Track[];
  followersCount?: number;
  followingCount?: number;
}

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
              setContent(''); onPostCreated(result.post);
              toast({ title: 'Posted to wall!' });
          } else throw new Error(result.error || 'Failed to post.');
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error', description: error.message });
      } finally { setIsSubmitting(false); }
  };

  return (
      <div className="bg-black/40 border border-white/5 rounded-[2.5rem] p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-2 px-1">
                 <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Post on Wall</span>
              </div>
              <Textarea 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                placeholder="Leave a public message..." 
                className="bg-black/20 border-white/10 min-h-[100px] rounded-2xl text-[15px] focus-visible:ring-primary shadow-inner" 
                disabled={isSubmitting} 
              />
              <div className="flex justify-end pt-1">
                <Button type="submit" size="sm" className="h-10 px-8 rounded-full animated-border-button text-[11px] font-black uppercase tracking-widest text-white shadow-lg" disabled={isSubmitting}>
                   <Send className="mr-2 h-3.5 w-3.5" />
                   <span>{isSubmitting ? 'Syncing...' : 'Transmit'}</span>
                </Button>
              </div>
          </form>
      </div>
  );
}

export function ProfilePageView({
  profileId,
  username: rawUsername,
  displayName: rawDisplayName,
  isVip,
  isAdmin,
  bio,
  theme: rawTheme,
  images = [],
  videos = [],
  authoredContent = [],
  wallPosts = [],
  relationshipStatus,
  relationshipTargetId,
  partnerIds = [],
  location,
  avatarUrl: rootAvatarUrl,
  coverUrl: rootCoverUrl,
  role,
  age,
  nationality,
  playlist = []
}: ProfilePageProps) {
  const { user: currentUser } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [localWallPosts, setLocalWallPosts] = useState<FeedPost[]>(wallPosts);

  useEffect(() => { setMounted(true); }, []);

  const theme = useMemo(() => normalizeTheme(rawTheme), [rawTheme]);
  const isViewingOwnProfile = useMemo(() => currentUser?.uid === profileId, [currentUser?.uid, profileId]);
  
  const displayName = useMemo(() => isUidPattern(rawDisplayName) ? 'Member' : (rawDisplayName || 'Member'), [rawDisplayName]);
  const username = useMemo(() => isUidPattern(rawUsername) ? 'member' : (rawUsername || 'member'), [rawUsername]);

  const cover = useMemo(() => safeImageUrl(rootCoverUrl || theme?.coverUrl || ''), [rootCoverUrl, theme?.coverUrl]);
  const avatar = useMemo(() => safeImageUrl(rootAvatarUrl || theme?.avatarUrl || ''), [rootAvatarUrl, theme?.avatarUrl]);

  const photosOnly = useMemo(() => images.filter((url: string) => !isVideoUrl(url)), [images]);
  const videosOnly = useMemo(() => (videos || []).filter((url: string) => isVideoUrl(url)), [videos]);

  const isDatingYou = useMemo(() => !!(currentUser?.uid && relationshipTargetId === currentUser.uid), [currentUser?.uid, relationshipTargetId]);
  const partnerId = useMemo(() => {
    if (relationshipTargetId && relationshipTargetId !== 'single' && relationshipTargetId !== 'null' && relationshipTargetId !== '') return relationshipTargetId;
    return (partnerIds && partnerIds.length > 0) ? partnerIds[0] : null;
  }, [relationshipTargetId, partnerIds]);
  const isInRelationship = useMemo(() => !!partnerId || (relationshipStatus && (relationshipStatus.includes('relationship') || relationshipStatus.includes('dating'))), [partnerId, relationshipStatus]);

  const rootStyles = useMemo(() => {
    const base: React.CSSProperties = { fontFamily: theme.fontFamily, color: theme.fontColor, '--theme-accent': theme.themeColor, '--overlay-strength': theme.overlayStrength } as any;
    if (theme.backgroundType === 'solid') base.backgroundColor = theme.backgroundValue;
    else if (theme.backgroundType === 'gradient') base.backgroundImage = theme.backgroundValue;
    else if (theme.backgroundType === 'image') { base.backgroundImage = `url(${theme.backgroundValue})`; base.backgroundSize = 'cover'; base.backgroundPosition = 'center'; base.backgroundAttachment = 'fixed'; }
    return base;
  }, [theme]);

  const hydratedAuthoredContent = useMemo(() => {
    const profileAuthor: AuthorSnapshot = { id: profileId, name: rawDisplayName, username: rawUsername, profileImageUrl: rootAvatarUrl || avatar || '', role: (role as any) || 'user', nationality: nationality || '', isAdmin } as AuthorSnapshot;
    return authoredContent.map((item: any) => { if ('author' in item) { return { ...item, author: hardenAuthor({ ...item.author, ...profileAuthor }) }; } return item; });
  }, [authoredContent, profileId, rawDisplayName, rawUsername, rootAvatarUrl, avatar, role, nationality, isAdmin]);

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({ title: 'Profile link copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCallClick = async (mode: 'voice' | 'video') => {
    if (!currentUser) {
      router.push('/auth/signin');
      return;
    }

    try {
      const res = await initiateMessengerCallAction({
        callerId: currentUser.uid,
        recipientId: profileId,
        callerName: currentUser.displayName || 'User',
        callerImage: currentUser.photoURL || null,
        mode
      });

      if (!res.success) throw new Error(res.error);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Call Error', description: err.message });
    }
  };

  if (!mounted) return null;

  return (
    <FeedProvider initialPosts={hydratedAuthoredContent.filter((item: any) => 'content' in item) as FeedPost[]} listen={false}>
      <div className={cn(styles.root, ...theme.animatedEffects.map(e => styles[`effect-${e}`]).filter(Boolean))} style={rootStyles}>
        {theme.backgroundType === 'video' && theme.backgroundValue && (
          <video src={theme.backgroundValue} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 pointer-events-none" crossOrigin="anonymous" />
        )}
        <div className={styles.overlay} />
        
        <div className={styles.page}>
          
          <div className={cn(styles.coverWrapper, styles[`border-${theme.borderStyle}`])}>
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
            {cover ? (
              isVideoUrl(cover) ? <video src={cover} autoPlay muted playsInline loop className={styles.coverImage} style={{ objectPosition: `50% ${theme.coverPosition?.y || 50}%` }} crossOrigin="anonymous" /> :
              <div className="relative w-full h-full"><Image src={cover} alt="Cover" fill unoptimized className={styles.coverImage} style={{ objectPosition: `50% ${theme.coverPosition?.y || 50}%` }} /></div>
            ) : <div className="w-full h-full bg-zinc-950 shadow-inner" />}
          </div>

          <header className="px-4 relative z-20 -mt-16 mb-16 text-center">
             <div className="inline-block relative mb-6 group">
                <div className={cn(styles.avatar, styles[`border-${theme.borderStyle}`], "h-16 w-16 lg:h-20 lg:w-20 rounded-[2.5rem] overflow-hidden border-4 border-black shadow-[0_0_50px_rgba(0,0,0,0.8)] relative bg-zinc-900 group-hover:scale-105 transition-transform duration-700 mx-auto")}>
                    <Avatar className="h-full w-full rounded-none">
                      <AvatarImage src={avatar} className="object-cover" style={{ objectPosition: `${theme.avatarPosition?.x || 50}% ${theme.avatarPosition?.y || 50}%` }} />
                      <AvatarFallback className="bg-zinc-800 text-5xl font-headline"><SafeInitial characterName={displayName} /></AvatarFallback>
                    </Avatar>
                    <div className="absolute top-2 right-2 scale-90"><TierBadge tier={isVip ? 'vip' : 'non-vip'} isAdmin={isAdmin} /></div>
                </div>
             </div>
             
             <div className="space-y-4 max-w-4xl mx-auto">
                <h1 className="text-5xl font-bold font-headline text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">{displayName}{age ? `, ${age}` : ''}</h1>
                <div className="flex flex-wrap items-center justify-center gap-3">
                   {isViewingOwnProfile ? <Button asChild className="h-11 rounded-full animated-border-button px-10 shadow-xl"><Link href="/profile/me/edit"><UserCog size={18} className="mr-2" /><span className="font-black uppercase tracking-widest text-[10px]">Edit Identity</span></Link></Button> : (
                     <>
                       <Button onClick={() => router.push(`/messages/${[currentUser?.uid, profileId].sort().join('_')}`)} className="h-11 rounded-full bg-primary font-black uppercase tracking-widest text-[10px] px-8 shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                         <MessageSquare size={18} className="mr-2" /> Message
                       </Button>
                       
                       <Button 
                         onClick={() => handleCallClick('voice')} 
                         className="h-11 w-11 rounded-full bg-white/5 border border-white/10 text-primary hover:bg-white/10 hover:scale-110 transition-transform p-0 shadow-lg"
                       >
                         <Phone size={18} />
                       </Button>
                       
                       <Button 
                         onClick={() => handleCallClick('video')} 
                         className="h-11 w-11 rounded-full bg-white/5 border border-white/10 text-primary hover:bg-white/10 hover:scale-110 transition-transform p-0 shadow-lg"
                       >
                         <Video size={18} />
                       </Button>

                       <FollowButton targetUserId={profileId} className="h-11 rounded-full px-8 bg-white/5 border-white/10 font-black text-[10px] uppercase shadow-lg" />
                     </>
                   )}
                   <div className="flex items-center gap-2.5 bg-black/60 border border-white/10 px-5 py-2 rounded-full shadow-lg backdrop-blur-xl">
                      <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Status</span>
                      <span className="text-xs font-bold text-primary truncate">{isInRelationship && partnerId ? (isDatingYou ? 'Partner' : <><span className="mr-1 italic">Dating</span><PartnerName partnerId={partnerId} /></>) : (relationshipStatus || 'Single').replace(/_/g, ' ')}</span>
                   </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-white text-[10px] font-black uppercase tracking-widest drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
                  <MapPin size={12} className="text-primary" />
                  <span>{location || 'Discovery Sector'}</span>
                </div>
             </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 px-4 max-w-7xl mx-auto">
            <main className={styles.main}>
               <div className="space-y-8">
                  {bio && (
                    <section className="bg-black/40 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                      <div className="flex items-center gap-2 mb-4">
                         <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner"><Info size={16} /></div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Backstory Archive</span>
                      </div>
                      <p className="text-base lg:text-lg text-white/90 leading-relaxed font-medium relative z-10 border-l-2 border-primary/30 pl-6 italic">{bio}</p>
                    </section>
                  )}

                  <section className="space-y-8 pb-32">
                     <div className="flex items-center gap-3 px-4 mb-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40">Identity Timeline</h2>
                     </div>
                     {hydratedAuthoredContent.length > 0 || localWallPosts.length > 0 ? (
                        <div className="space-y-8">
                          {hydratedAuthoredContent.map((item: any, idx: number) => 'content' in item ? <PostCard key={item.id || idx} post={item as FeedPost} /> : null)}
                          {localWallPosts.map((post: FeedPost) => <PostCard key={post.id} post={post} />)}
                        </div>
                      ) : (
                        <div className="text-center p-24 bg-card/20 rounded-[3rem] border border-dashed border-white/10 shadow-inner">
                          <Clock className="h-12 w-12 text-white/5 mx-auto mb-4" />
                          <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">No activity logs found</p>
                        </div>
                      )}
                  </section>
               </div>
            </main>

            <aside className={styles.sidebar}>
               <div className="space-y-6 sticky top-24">
                  <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden">
                    <VipGallery images={photosOnly} isVIP={isVip} />
                  </div>
                  {videosOnly.length > 0 && (
                    <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-6 shadow-2xl">
                       <div className="flex items-center gap-2 mb-6 px-1">
                         <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20"><Film size={14} /></div>
                         <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40">Cinematics</h2>
                       </div>
                       <ProfileVideos videos={videosOnly} />
                    </div>
                  )}
                  <MySpaceMusicPlayer />
                  <MySpacePlaylist profileId={profileId} initialPlaylist={playlist} />
                  <CreatePostOnWall targetUserId={profileId} onPostCreated={(p) => setLocalWallPosts(prev => [p, ...prev])} />
               </div>
            </aside>
          </div>
        </div>
      </div>
    </FeedProvider>
  );
}
