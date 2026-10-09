'use client';

import React, { useState, useMemo } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useAdminActingAs } from '@/providers/AdminActingAsProvider';
import { useToast } from '@/hooks/use-toast';
import { addCommentAction, addCommentReaction, deleteCommentAction } from '@/server/actions/feed';
import type { FeedPost, AuthorSnapshot, Comment, ReactionActor } from '@/lib/types';
import { REACTION_EMOJIS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TimeAgo } from '@/components/ui/time-ago';
import { useVipLimits } from '@/hooks/useVipLimits';
import { getPlaceholderImage } from '@/lib/placeholder';
import { useFeed } from './FeedProvider';
import { Heart, Reply, MoreHorizontal, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type CommentSectionProps = {
  post: FeedPost;
  isLocked?: boolean;
};

export function CommentSection({ post, isLocked }: CommentSectionProps) {
  const { user, vipTier: authVipTier, isAdmin: authIsAdmin } = useUser();
  const { actingAs } = useAdminActingAs();
  const { profile, isAdmin: profileIsAdmin } = useUserProfile();
  const { updatePost } = useFeed();
  const { toast } = useToast();

  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const isAdmin = authIsAdmin || profileIsAdmin;
  const currentTier = (profile?.vipTier as any) || authVipTier || 'non-vip';

  const { canComment, registerComment } = useVipLimits(
    user ? { id: user.uid, vipTier: currentTier, isAdmin: !!isAdmin } : null
  );

  const identity: AuthorSnapshot | null = useMemo(() => {
    if (actingAs) {
      return {
        id: actingAs.id,
        name: actingAs.name,
        profileImageUrl: actingAs.media.profileImageUrl || getPlaceholderImage(actingAs.id),
        promotionTier: actingAs.promotionTier as 'non-vip' | 'vip',
        role: 'aigirl',
        currentMood: actingAs.currentMood || 'Neutral',
        isAdmin: false,
        nationality: actingAs.nationality || 'American',
      };
    }
    if (user) {
      return {
        id: user.uid,
        name: profile?.displayName || user.displayName || 'You',
        profileImageUrl: profile?.photoURL || user.photoURL || getPlaceholderImage(user.uid),
        vipTier: currentTier as 'non-vip' | 'vip',
        role: 'user',
        currentMood: 'Neutral',
        isAdmin: !!isAdmin,
        nationality: profile?.nationality || 'American',
      };
    }
    return null;
  }, [actingAs, user, profile, currentTier, isAdmin]);

  const handleAddComment = async (text: string, parentId: string | null = null) => {
    if (!identity || !text.trim()) return;

    if (!canComment()) {
      toast({
        variant: 'destructive',
        title: 'Daily Limit Reached',
        description: 'Upgrade to VIP for unlimited comments.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await addCommentAction({
        postId: post.id,
        actorId: identity.id,
        actorType: identity.role === 'aigirl' ? 'girl' : 'user',
        realUserId: identity.role === 'aigirl' ? user?.uid : identity.id,
        text,
        parentId,
      });

      if (result.success && result.comment) {
        if (!parentId) setCommentText('');
        else setReplyingTo(null);
        
        registerComment();

        updatePost(post.id, (currentPost) => {
          const alreadyExists = currentPost.comments?.some(c => c.id === result.comment.id);
          if (alreadyExists) return currentPost;
          return {
            ...currentPost,
            comments: [...(currentPost.comments || []), result.comment],
          };
        });

        toast({ title: parentId ? 'Reply posted!' : 'Comment posted!' });
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const topLevelComments = useMemo(() => 
    (post.comments || []).filter(c => !c.parentId), 
    [post.comments]
  );

  return (
    <div className="w-full space-y-4 mt-4 border-t border-white/5 pt-4">
      <form onSubmit={(e) => { e.preventDefault(); handleAddComment(commentText); }} className="flex items-center gap-2">
        <Input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Write a comment..."
          className="bg-secondary/50 rounded-full border-white/10"
          disabled={isLocked || isSubmitting}
        />
        <Button
          type="submit"
          size="sm"
          className="rounded-full px-4"
          disabled={isLocked || isSubmitting || !commentText.trim()}
        >
          Post
        </Button>
      </form>

      <div className="space-y-4">
        {topLevelComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            post={post}
            identity={identity}
            isReplying={replyingTo === comment.id}
            onReplyToggle={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
            onAddReply={(text) => handleAddComment(text, comment.id)}
            replies={(post.comments || []).filter(c => c.parentId === comment.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  post,
  identity,
  isReplying,
  onReplyToggle,
  onAddReply,
  replies
}: {
  comment: Comment;
  post: FeedPost;
  identity: AuthorSnapshot | null;
  isReplying: boolean;
  onReplyToggle: () => void;
  onAddReply: (text: string) => void;
  replies: Comment[];
}) {
  const { updatePost } = useFeed();
  const [replyText, setReplyText] = useState('');
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = identity && (identity.id === comment.author.id || identity.isAdmin);

  const handleDelete = async () => {
    if (!canDelete || !identity) return;

    setIsDeleting(true);
    try {
      const result = await deleteCommentAction(post.id, comment.id, identity.id);

      if (result.success) {
        updatePost(post.id, (currentPost) => ({
          ...currentPost,
          comments: currentPost.comments.filter(c => c.id !== comment.id)
        }));
        toast({ title: 'Comment deleted' });
      } else {
        throw new Error(result.error || 'Failed to delete comment');
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!identity) return;

    const reactionActor: ReactionActor = {
      actorId: identity.id,
      actorType: identity.role === 'aigirl' ? 'girl' : 'user',
      realUserId: identity.id,
      author: identity,
      profileImageUrl: identity.profileImageUrl,
      id: identity.id,
      name: identity.name,
    };

    updatePost(post.id, (currentPost) => {
      const newComments = currentPost.comments.map(c => {
        if (c.id !== comment.id) return c;
        const newReactions = { ...(c.reactions || {}) };
        let prevEmoji: string | null = null;

        for (const k in newReactions) {
          const idx = newReactions[k]?.findIndex(r => r.actorId === identity.id) ?? -1;
          if (idx > -1) {
            prevEmoji = k;
            newReactions[k].splice(idx, 1);
            if (newReactions[k].length === 0) delete newReactions[k];
            break;
          }
        }

        if (prevEmoji !== emoji) {
          if (!newReactions[emoji]) newReactions[emoji] = [];
          newReactions[emoji].push(reactionActor);
        }
        return { ...c, reactions: newReactions };
      });
      return { ...currentPost, comments: newComments };
    });

    try {
      await addCommentReaction(post.id, comment.id, emoji, reactionActor);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Reaction failed' });
    }
  };

  const userReaction = useMemo(() => {
    if (!identity) return null;
    for (const emoji in comment.reactions) {
      if (comment.reactions[emoji]?.some(r => r.actorId === identity.id)) return emoji;
    }
    return null;
  }, [comment.reactions, identity]);

  return (
    <div className="flex flex-col gap-2 group">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.author.profileImageUrl || undefined} className="object-cover object-top" />
          <AvatarFallback>{comment.author.name?.[0] ?? 'U'}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="bg-secondary/30 p-2 rounded-2xl inline-block max-w-full relative">
            <div className="flex justify-between items-center gap-4 mb-0.5">
              <span className="text-xs font-bold text-primary/90">{comment.author.name}</span>
              <TimeAgo timestamp={comment.timestamp} className="text-[10px] text-white/30" />
            </div>
            <p className="text-sm whitespace-pre-wrap leading-tight text-white/90">{comment.text}</p>
          </div>

          <div className="flex items-center gap-4 mt-1 px-1">
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn("text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:text-primary transition-colors", userReaction ? "text-primary" : "text-white/40")}>
                  {userReaction || <Heart size={10} />} {userReaction ? 'Reacted' : 'React'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1 bg-black/90 backdrop-blur-xl border-white/10 rounded-full shadow-2xl">
                <div className="flex gap-1">
                  {REACTION_EMOJIS.slice(0, 6).map(emoji => (
                    <button key={emoji} onClick={() => handleReaction(emoji)} className="p-1.5 hover:bg-white/10 rounded-full transition-transform hover:scale-125 text-lg">
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <button 
              onClick={onReplyToggle}
              className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Reply size={10} /> Reply
            </button>

            <div className="flex-1 flex justify-end">
              {canDelete && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal size={14} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-1">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" className="w-full text-sm justify-start text-destructive hover:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this comment.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className="flex -space-x-1">
              {Object.entries(comment.reactions || {}).map(([emoji, actors]) => (
                <div key={emoji} className="bg-black/40 border border-white/5 rounded-full px-1.5 py-0.5 flex items-center gap-1 scale-75 origin-right">
                  <span className="text-[10px]">{emoji}</span>
                  <span className="text-[8px] text-white/60 font-bold">{actors.length}</span>
                </div>
              ))}
            </div>
          </div>

          {isReplying && (
            <div className="mt-2 pl-2 border-l-2 border-primary/20 animate-in slide-in-from-left-1 duration-200">
              <div className="flex gap-2">
                <Input
                  autoFocus
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${comment.author.name}...`}
                  className="h-8 text-xs bg-secondary/50 rounded-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onAddReply(replyText);
                      setReplyText('');
                    }
                  }}
                />
                <Button size="sm" className="h-8 rounded-full text-[10px] uppercase font-bold" onClick={() => { onAddReply(replyText); setReplyText(''); }}>
                  Send
                </Button>
              </div>
            </div>
          )}

          {replies.length > 0 && (
            <div className="mt-3 space-y-3 pl-4 border-l border-white/10">
              {replies.map(reply => (
                <div key={reply.id} className="flex items-start gap-2">
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarImage src={reply.author.profileImageUrl || undefined} className="object-cover object-top" />
                    <AvatarFallback>{reply.author.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="bg-secondary/20 p-2 rounded-2xl flex-1">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[10px] font-bold text-primary/70">{reply.author.name}</span>
                      <TimeAgo timestamp={reply.timestamp} className="text-[8px] text-white/20" />
                    </div>
                    <p className="text-xs text-white/80">{reply.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
