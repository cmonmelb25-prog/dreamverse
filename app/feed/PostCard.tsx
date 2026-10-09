'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
    Heart, 
    MessageCircle, 
    Share2, 
    Trash2, 
    Loader, 
    Languages, 
    MoreVertical,
    ShieldAlert,
    ExternalLink
} from 'lucide-react';
import { cn, isVideoUrl, normalizeMediaUrl, safeImageUrl, hardenAuthor, getSafeDate } from '@/lib/utils';
import { getImageUrl } from '@/lib/storage/getImageUrl';
import type { FeedPost, ReactionActor, AuthorSnapshot, LinkPreview } from '@/lib/types';
import { REACTION_EMOJIS } from '@/lib/constants';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';
import { useAdminActingAs } from '@/providers/AdminActingAsProvider';
import { useFeed } from './FeedProvider';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogFooter, 
    AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { addReaction, deletePost } from '@/server/actions/feed';
import { CommentSection } from './CommentSection';
import { SafeInitial } from '@/components/safe-initial';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getPlaceholderImage } from '@/lib/placeholder';
import { TimeAgo } from '@/components/ui/time-ago';
import { getMoodColor, MoodName } from '@/lib/moods';
import { TierBadge } from '@/components/tier-badge';
import { translatePostAction } from '@/server/actions/translate-actions';
import { getLinkPreviewAction } from '@/server/actions/link-preview';
import { ScrollArea } from '@/components/ui/scroll-area';

function ReactionButton({ onSelect, actor, reactions }: { onSelect: (emoji: string) => void; actor: AuthorSnapshot | null; reactions: Record<string, ReactionActor[]>; }) {
  const [isOpen, setIsOpen] = useState(false);
  const userReaction = useMemo(() => {
      if (!actor) return null;
      for (const emoji in reactions) { if (reactions[emoji]?.some(r => r.actorId === actor.id)) return emoji; }
      return null;
  }, [reactions, actor]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("w-full text-white/60 hover:text-white hover:bg-white/5 text-xs md:text-sm", userReaction && "text-primary bg-primary/5")}>
          {userReaction ? <span className="text-lg md:text-xl mr-1 md:mr-2">{userReaction}</span> : <Heart className="mr-1 md:mr-2 h-4 w-4" />}
          React
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 bg-black/90 backdrop-blur-2xl border-primary/30 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
        <div className="grid grid-cols-6 gap-1 sm:gap-2">
          {REACTION_EMOJIS.map((emoji) => (
            <Button key={emoji} variant="ghost" size="icon" className="text-xl md:text-2xl hover:bg-primary/20 transition-all hover:scale-125 h-8 w-8 md:h-10 md:w-10 p-0" onClick={() => { onSelect(emoji); setIsOpen(false); }}>
              {emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ReactionSummary({ reactions }: { reactions: Record<string, ReactionActor[]> }) {
    const allActors = useMemo(() => {
        const actors: ReactionActor[] = [];
        const seen = new Set();
        Object.values(reactions || {}).flat().forEach(r => {
            if (!seen.has(r.actorId)) {
                actors.push(r);
                seen.add(r.actorId);
            }
        });
        return actors;
    }, [reactions]);

    const topReactions = useMemo(() => Object.entries(reactions || {}).filter(([, reactors]) => Array.isArray(reactors) && reactors.length > 0).sort(([, a], [, b]) => b.length - a.length).slice(0, 3), [reactions]);
    const totalCount = allActors.length;
    
    if (totalCount === 0) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-default group">
                        <div className="flex -space-x-1.5">
                            {topReactions.map(([emoji]) => (
                                <span key={emoji} className="text-xs bg-black/60 rounded-full px-1 py-0.5 border border-white/10 shadow-sm transition-transform group-hover:-translate-y-0.5">{emoji}</span>
                            ))}
                        </div>
                        <span className="ml-1 md:ml-1.5 font-bold text-white/60 group-hover:text-white transition-colors">{totalCount}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent className="p-0 bg-zinc-950 border-white/10 shadow-2xl rounded-xl overflow-hidden w-64">
                    <div className="p-3 bg-white/5 border-b border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/80">Reactions ({totalCount})</p>
                    </div>
                    <ScrollArea className="max-h-48">
                        <div className="p-2 space-y-1">
                            {allActors.map((actor) => (
                                <div key={actor.actorId} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                                    <Avatar className="h-6 w-6 border border-white/10">
                                        <AvatarImage src={actor.profileImageUrl || getPlaceholderImage(actor.actorId)} />
                                        <AvatarFallback>{actor.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-bold text-white/90 truncate">{actor.name}</span>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

/**
 * PRODUCTION-SAFE POST CARD
 * PROTOCOL: Absolute Narrative Horizon (ANH).
 * FEATURES: Hyper-Link Perception with Lazy Resolution.
 */
export default function PostCard({ post }: { post: FeedPost }) {
  const { user, isAdmin } = useUser();
  const { profile } = useUserProfile();
  const { updatePost, removePost } = useFeed();
  const { actingAs } = useAdminActingAs();
  const { toast } = useToast();
  
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isShowingTranslation, setIsShowingTranslation] = useState(false);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // 🛡️ HYPER-LINK PERCEPTION ENGINE
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(post.linkPreview || null);
  const [isResolvingLink, setIsResolvingLink] = useState(false);
  
  const videoElementRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
    const resolve = async () => {
      const source = post.mediaPath || post.mediaUrl;
      if (!source) return;
      const url = await getImageUrl(source);
      if (url) setMediaSrc(normalizeMediaUrl(url));
    };
    resolve();
  }, [post.mediaPath, post.mediaUrl]);

  // LAZY LINK PERCEPTION: Resolve missing previews from content (Heals old posts)
  useEffect(() => {
    if (linkPreview) return;
    if (!post.content) return;

    const urlMatch = post.content.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      setIsResolvingLink(true);
      getLinkPreviewAction(urlMatch[0]).then(p => {
        if (p) setLinkPreview(p);
        setIsResolvingLink(false);
      }).catch(() => setIsResolvingLink(false));
    }
  }, [post.content, linkPreview]);

  const postAuthor = useMemo(() => hardenAuthor(post.author), [post.author]);
  const actor: AuthorSnapshot | null = useMemo(() => {
    if (actingAs) return hardenAuthor(actingAs);
    if (user) return hardenAuthor({ ...profile, id: user.uid, uid: user.uid });
    return null;
  }, [actingAs, user, profile]);

  const canDelete = useMemo(() => {
    if (!mounted || !user) return false;
    if (isAdmin) return true;
    return postAuthor.id === user.uid || post.actorId === user.uid;
  }, [user, isAdmin, postAuthor.id, post.actorId, mounted]);

  const handleDeletePost = async () => {
    if (!user || !canDelete) return;
    setIsDeleting(true);
    try {
        const res = await deletePost(post.id, actor?.id || user.uid, user.uid);
        if (res.success) removePost(post.id);
    } finally { setIsDeleting(false); }
  };

  const handleTranslate = async () => {
    if (isShowingTranslation) { setIsShowingTranslation(false); return; }
    if (translatedText) { setIsShowingTranslation(true); return; }
    setIsTranslating(true);
    try {
      const res = await translatePostAction(post.content, String(profile?.nationality || 'English'));
      if (res.success && res.translatedText) { setTranslatedText(res.translatedText); setIsShowingTranslation(true); }
    } finally { setIsTranslating(false); }
  };

  const handleReaction = async (emoji: string) => {
    if (!actor) return;
    const reactionActor: ReactionActor = { actorId: actor.id, actorType: actingAs ? 'girl' : 'user', id: actor.id, name: actor.name, profileImageUrl: actor.profileImageUrl, author: actor };
    updatePost(post.id, (cp) => {
      const reactions = { ...(cp.reactions || {}) };
      for (const key in reactions) { 
        const i = reactions[key]?.findIndex((r: any) => r.actorId === actor.id) ?? -1; 
        if (i > -1) { 
          reactions[key].splice(i, 1); 
          if (reactions[key].length === 0) delete reactions[key]; 
          break; 
        } 
      }
      if (!reactions[emoji]) reactions[emoji] = []; 
      reactions[emoji].push(reactionActor);
      return { ...cp, reactions };
    });
    addReaction(post.id, emoji, reactionActor, postAuthor.id);
  };

  const isVideo = useMemo(() => isVideoUrl(post.mediaPath || post.mediaUrl), [post.mediaPath, post.mediaUrl]);
  const moodColor = getMoodColor(postAuthor.currentMood as MoodName | undefined);

  return (
    <Card className="feed-card shadow-2xl w-full mx-auto relative overflow-hidden" style={{ '--mood-color': moodColor } as React.CSSProperties}>
      <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
          <TierBadge tier={postAuthor.promotionTier} isAdmin={postAuthor.isAdmin} className="scale-90" />
          {mounted && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/20 backdrop-blur-md text-white/40 hover:text-white border border-white/5"><MoreVertical size={14} /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-950 border-white/10 text-white">
                  {canDelete && (
                      <AlertDialog>
                          <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"><Trash2 className="mr-2 h-4 w-4" /> Delete Post</DropdownMenuItem></AlertDialogTrigger>
                          <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
                              <AlertDialogHeader><AlertDialogTitle>Delete this post?</AlertDialogTitle></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel className="bg-white/5 border-white/5 text-white">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeletePost} className="bg-destructive text-white hover:bg-destructive/90">{isDeleting ? <Loader className="h-4 w-4 animate-spin" /> : 'Confirm Delete'}</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                  )}
                  <DropdownMenuItem className="cursor-pointer"><ShieldAlert className="mr-2 h-4 w-4 text-amber-500" /> Report Content</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
      </div>

      <CardHeader className="flex flex-row items-center gap-4 p-4 pb-2">
        <Link href={`/profile/${postAuthor.id}`} prefetch={false} className="shrink-0">
            <Avatar className="h-12 w-12 border-2 border-primary/30 shadow-lg"><AvatarImage src={postAuthor.profileImageUrl} className="object-cover object-top" /><AvatarFallback><SafeInitial characterName={postAuthor.name} /></AvatarFallback></Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${postAuthor.id}`} prefetch={false} className="min-w-0 max-w-full">
              <div className="font-bold text-lg hover:underline text-white truncate drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.8)] tracking-tight transition-colors hover:text-primary">
                {post.isRepost ? `${postAuthor.name} shared ${post.originalAuthor?.name || 'User'}'s post` : postAuthor.name}
              </div>
          </Link>
          <div className="flex items-center gap-3">
            <TimeAgo timestamp={post.timestamp} className="text-[10px] text-white/70 font-black uppercase tracking-widest" />
            <button onClick={handleTranslate} className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-1">
              {isTranslating ? <Loader className="h-2.5 w-2.5 animate-spin" /> : <Languages className="h-3 w-3" />}
              {isShowingTranslation ? 'Original' : 'Translate'}
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 relative text-left">
        {post.content && (
          <div className="px-4 pb-2">
             <p className={cn("text-base leading-relaxed whitespace-pre-wrap font-medium mb-4", isShowingTranslation ? "text-primary italic" : "text-white/90")}>
               {isShowingTranslation ? translatedText : post.content}
             </p>
          </div>
        )}

        {/* 🛡️ HYPER-LINK PERCEPTION CARD (Facebook Style) */}
        {linkPreview && (
          <div className="px-4 mb-4">
             <Link 
               href={linkPreview.url} 
               target="_blank" 
               className="block bg-black/40 border border-white/10 rounded-2xl overflow-hidden hover:border-primary/40 transition-all shadow-xl group/link"
             >
               {linkPreview.image && (
                 <div className="relative aspect-video bg-zinc-900">
                   <img src={linkPreview.image} className="w-full h-full object-cover group-hover/link:scale-105 transition-transform duration-700" alt="Link preview" />
                   <div className="absolute inset-0 bg-black/20" />
                 </div>
               )}
               <div className="p-4 space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                     <div className="h-1 w-1 rounded-full bg-primary" />
                     <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 truncate">{linkPreview.siteName || new URL(linkPreview.url).hostname}</p>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover/link:text-primary transition-colors line-clamp-1">{linkPreview.title}</h4>
                  {linkPreview.description && <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">{linkPreview.description}</p>}
               </div>
             </Link>
          </div>
        )}

        {isResolvingLink && (
           <div className="px-4 mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/40">
              <Loader className="h-3 w-3 animate-spin" />
              <span>Resolving Reality Link...</span>
           </div>
        )}

        {mediaSrc && (
          <div className="relative overflow-hidden bg-black/40 border-y border-white/5 shadow-2xl flex items-center justify-center -mx-4 min-h-[300px] max-h-[70vh]">
            {isVideo ? <video ref={videoElementRef} src={mediaSrc} controls playsInline className="w-full h-full max-h-[70vh] block bg-black object-contain" crossOrigin="anonymous" /> : <img src={mediaSrc} alt="Post media" className="w-full h-full max-h-[70vh] block object-contain" loading="lazy" crossOrigin="anonymous" />}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col items-start p-4 pt-3">
        <div className="flex justify-between w-full text-[10px] text-white/40 pb-3 px-1">
          <ReactionSummary reactions={post.reactions} />
          <button onClick={() => setIsCommentsOpen(!isCommentsOpen)} className="hover:text-white transition-colors font-bold uppercase tracking-tighter">
            {(post.comments || []).length} comments
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1 w-full border-t border-white/5 pt-2">
            <ReactionButton onSelect={handleReaction} actor={actor} reactions={post.reactions} />
            <Button variant="ghost" size="sm" className="w-full text-white/60 hover:text-white hover:bg-white/5" onClick={() => setIsCommentsOpen(!isCommentsOpen)}><MessageCircle className="mr-1 md:mr-2 h-4 w-4" /> Comment</Button>
            <Button variant="ghost" size="sm" className="w-full text-white/60 hover:text-white hover:bg-white/5" onClick={async () => { 
              setIsSharing(true); 
              try {
                const res = await fetch('/api/share-post', { 
                  method: 'POST', 
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ postId: post.id }), 
                  credentials: 'include' 
                }); 
                if(res.ok) toast({ title: 'Shared to feed!' });
                else throw new Error('Request failed');
              } catch (err) {
                toast({ variant: 'destructive', title: 'Share failed', description: 'Could not connect to the multiverse.' });
              } finally { setIsSharing(false); }
            }} disabled={isSharing}>{isSharing ? <Loader className="mr-1 md:mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-1 md:mr-2 h-4 w-4" />} Share</Button>
        </div>
        {isCommentsOpen && <CommentSection post={post} />}
      </CardFooter>
    </Card>
  );
}
