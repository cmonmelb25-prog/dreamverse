'use client';

import type { Reel, ReactionActor, AuthorSnapshot } from '@/lib/types';
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Heart,
  MessageCircle,
  Volume2,
  VolumeX,
  Play,
  Trash2,
  AlertCircle,
  Plus,
  Languages,
  Loader,
  Share2,
  Users
} from 'lucide-react';
import { cn, hardenAuthor, safeImageUrl, normalizeMediaUrl } from '@/lib/utils';
import { getImageUrl } from '@/lib/storage/getImageUrl';
import { useUser } from '@/firebase/auth/use-user';
import { addReelLike, deleteReel as deleteReelAction } from '@/server/actions/reels';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useAdminActingAs } from '@/providers/AdminActingAsProvider';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getPlaceholderImage } from '@/lib/placeholder';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useReelsContext } from '@/context/ReelsContext';
import { TimeAgo } from '@/components/ui/time-ago';
import { translatePostAction } from '@/server/actions/translate-actions';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TierBadge } from '@/components/tier-badge';

/**
 * PRODUCTION-GRADE REEL CARD
 * SYNC: Uses native video events to ensure isPlaying state is always accurate.
 * FEEDBACK: Added a Play icon overlay when paused.
 * LIFTED: Info overlay raised to bottom-32 to clear the navigation bar.
 */
export default function ReelCard({
  reel,
  isVisible,
  actor,
  isGlobalLoading,
  onCreateReelAction,
}: {
  reel: Reel;
  isVisible: boolean;
  actor: AuthorSnapshot | null;
  isGlobalLoading: boolean;
  onCreateReelAction: () => void;
}) {
  const { user, isAdmin } = useUser();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const { deleteReel, setCommentingReel } = useReelsContext();
  const { actingAs } = useAdminActingAs();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [likes, setLikes] = useState<ReactionActor[]>(Array.isArray(reel.likes) ? reel.likes : []);
  const [userHasLiked, setUserHasLiked] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string>("");
  const [isLikesOpen, setIsLikesOpen] = useState(false);

  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isShowingTranslation, setIsShowingTranslation] = useState(false);

  const author = useMemo(() => hardenAuthor(reel.author), [reel.author]);

  useEffect(() => {
    const resolve = async () => {
      const source = reel.videoPath || reel.videoUrl;
      const url = await getImageUrl(source);
      if (url) setPlaybackUrl(normalizeMediaUrl(url));
    };
    resolve();
  }, [reel.videoUrl, reel.videoPath]);

  useEffect(() => {
    if (actor) setUserHasLiked(likes.some((like) => like.actorId === actor.id));
  }, [likes, actor]);

  const handleLike = async () => {
    if (!user || !actor) return;
    const reactionActor: ReactionActor = { 
      actorId: actor.id, 
      actorType: actor.role === 'aigirl' ? 'girl' : 'user', 
      id: actor.id, 
      name: actor.name, 
      profileImageUrl: actor.profileImageUrl ?? null, 
      author: actor 
    };
    const wasLiked = userHasLiked;
    setUserHasLiked(!wasLiked);
    setLikes(prev => wasLiked ? prev.filter(l => l.actorId !== actor.id) : [...prev, reactionActor]);
    addReelLike(reel.id, reactionActor);
  };

  const handleTranslate = async () => {
    if (isShowingTranslation) { setIsShowingTranslation(false); return; }
    if (translatedText) { setIsShowingTranslation(true); return; }
    setIsTranslating(true);
    try {
      const res = await translatePostAction(reel.caption, String(profile?.nationality || 'English'));
      if (res.success && res.translatedText) { setTranslatedText(res.translatedText); setIsShowingTranslation(true); }
    } finally { setIsTranslating(false); }
  };

  // 🛡️ REFINED PLAYBACK ENGINE: Syncs with visible state
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !playbackUrl) return;
    if (isVisible && !isGlobalLoading) {
      vid.play().catch(err => {
         console.debug("[Reels] Playback deferred until user interaction.");
      });
    } else {
      vid.pause();
    }
  }, [isVisible, isGlobalLoading, playbackUrl]);

  const handleVideoClick = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  };

  const canDelete = isAdmin || (user && (reel.realUserId === user.uid || reel.actorId === user.uid));
  const authorPic = author.profileImageUrl || getPlaceholderImage(author.id);

  return (
    <div className="relative h-full w-full bg-black flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 z-0 opacity-40 blur-3xl scale-110 pointer-events-none" 
        style={{ backgroundImage: `url(${playbackUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} 
      />
      
      {playbackUrl ? (
        <video 
          ref={videoRef} 
          src={playbackUrl} 
          loop 
          playsInline 
          muted={isMuted} 
          preload="metadata" 
          className="h-full w-full object-contain relative z-10 cursor-pointer" 
          onClick={handleVideoClick}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          crossOrigin="anonymous" 
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground relative z-10 h-full w-full bg-zinc-950">
          <Loader className="animate-spin text-primary h-8 w-8" />
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Connecting to transmission...</p>
        </div>
      )}

      {/* 🛡️ PLAYBACK STATUS OVERLAY (Reference Match) */}
      <div className={cn(
        "absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-300 pointer-events-none",
        isPlaying ? "opacity-0" : "opacity-100 bg-black/30"
      )}>
        <div className="bg-white/10 backdrop-blur-md rounded-full p-6 border border-white/20 shadow-2xl">
          <Play className="h-12 w-12 text-white fill-white translate-x-1" />
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none z-[15]" />

      <div className="absolute bottom-32 left-4 right-20 text-white z-30 md:bottom-20">
        <div className="flex flex-col gap-3 mb-4">
          <Link href={`/profile/${author.id}`} prefetch={false} className="block relative w-fit pointer-events-auto">
            <Avatar className="h-12 w-12 border-2 border-white shadow-xl bg-zinc-900">
              <AvatarImage src={authorPic} className="object-cover object-top" />
              <AvatarFallback>{(author.name || 'F')[0]}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-primary rounded-full p-0.5 border-2 border-black shadow-lg">
              <Plus size={10} className="text-white font-black" />
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/profile/${author.id}`} prefetch={false} className="hover:text-primary transition-colors pointer-events-auto">
              <span className="font-bold text-lg drop-shadow-md">@{author.name}</span>
            </Link>
            <TierBadge tier={author.promotionTier} isAdmin={author.isAdmin} className="scale-90" />
          </div>
        </div>
        <div className="space-y-2 max-w-full">
          <p className={cn("text-sm line-clamp-2 font-medium text-white/90 drop-shadow-sm transition-all", isShowingTranslation && "text-primary italic")}>
            {isShowingTranslation ? translatedText : reel.caption}
          </p>
          <div className="flex items-center gap-3">
            <TimeAgo timestamp={reel.timestamp} className="text-[10px] font-bold uppercase tracking-widest text-white/60" />
            <button onClick={handleTranslate} className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-1 pointer-events-auto">
              {isTranslating ? <Loader className="h-2 w-2 animate-spin" /> : <Languages className="h-2.5 w-2.5" />}
              {isShowingTranslation ? 'Original' : 'Translate'}
            </button>
          </div>
        </div>
      </div>

      <TooltipProvider>
        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 text-white z-40 md:bottom-20">
          <button type="button" className="flex flex-col items-center group active:scale-90 transition-transform pointer-events-auto" onClick={handleLike}>
            <div className={cn('p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-xl group-hover:bg-white/20 transition-colors', userHasLiked && 'bg-primary/10 border-primary/20')}>
              <Heart size={24} className={cn('transition-all duration-300 drop-shadow-xl', userHasLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-white')} />
            </div>
            <span onClick={(e) => { e.stopPropagation(); setIsLikesOpen(true); }} className="text-[11px] font-black mt-1 drop-shadow-md hover:underline">{likes.length}</span>
          </button>

          <button type="button" className="flex flex-col items-center group active:scale-90 transition-transform pointer-events-auto" onClick={() => setCommentingReel(reel)}>
            <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-xl group-hover:bg-white/20 transition-colors">
              <MessageCircle size={24} className="text-white drop-shadow-xl" />
            </div>
            <span className="text-[11px] font-bold mt-1 drop-shadow-md">{reel.commentCount || 0}</span>
          </button>

          <button type="button" className="h-12 w-12 rounded-full bg-gradient-to-tr from-[#ff0084] to-[#6a00f4] flex items-center justify-center shadow-[0_0_20px_rgba(255,0,132,0.4)] hover:scale-110 active:scale-90 transition-all border-2 border-white/20 pointer-events-auto" onClick={onCreateReelAction}>
            <Plus size={28} className="text-white" />
          </button>
          
          <button type="button" className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-xl hover:bg-white/20 transition-all pointer-events-auto" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          {canDelete && (
            <button type="button" className="p-2 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/30 shadow-xl hover:bg-red-500/40 transition-all text-red-400 pointer-events-auto" onClick={() => deleteReelAction(reel.id, user!.uid).then(res => res.success && deleteReel(reel.id))}>
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </TooltipProvider>

      <Sheet open={isLikesOpen} onOpenChange={setIsLikesOpen}>
        <SheetContent side="right" className="bg-black/95 backdrop-blur-xl border-white/10 p-0 w-full sm:max-w-md">
          <SheetHeader className="p-6 border-b border-white/5">
            <SheetTitle className="text-white flex items-center gap-2">
              <Heart className="text-primary h-5 w-5 fill-primary" /> 
              Liked by
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-100px)]">
            <div className="p-4 space-y-2">
              {likes.map((like) => (
                <div key={like.actorId} className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border border-white/10">
                      <AvatarImage src={like.profileImageUrl || getPlaceholderImage(like.actorId)} />
                      <AvatarFallback>{like.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-white">{like.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="rounded-full text-[10px] font-black uppercase tracking-widest">
                    <Link href={`/profile/${like.actorId}`}>View</Link>
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
