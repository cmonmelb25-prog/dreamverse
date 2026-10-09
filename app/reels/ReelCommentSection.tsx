'use client';

import React, { useState, useMemo } from 'react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useUser } from '@/firebase/auth/use-user';
import { useAdminActingAs } from '@/providers/AdminActingAsProvider';
import { useToast } from '@/hooks/use-toast';
import { addReelComment, deleteReelComment } from '@/server/actions/reels';
import type { Reel, Comment, AuthorSnapshot } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TimeAgo } from '@/components/ui/time-ago';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import Link from 'next/link';
import { getPlaceholderImage } from '@/lib/placeholder';
import { useReelsContext } from '@/context/ReelsContext';

type ReelCommentSectionProps = {
  reel: Reel;
  comments: Comment[];
  isLocked?: boolean;
};

export function ReelCommentSection({
  reel,
  comments,
  isLocked,
}: ReelCommentSectionProps) {
  const { user, vipTier: authVipTier } = useUser();
  const { profile, isAdmin, vipTier: profileVipTier } = useUserProfile();
  const { actingAs } = useAdminActingAs();
  const { toast } = useToast();
  const { updateReelCommentCount } = useReelsContext();

  // Identity builder
  const identity: AuthorSnapshot | null = useMemo(() => {
    const currentTier =
      (profile?.vipTier as any) || profileVipTier || authVipTier || 'non-vip';

    if (actingAs) {
      return {
        id: actingAs.id,
        name: actingAs.name,
        profileImageUrl:
          actingAs.media?.profileImageUrl ||
          getPlaceholderImage(actingAs.id),
        role: 'aigirl',
        currentMood: actingAs.currentMood || 'Neutral',
        promotionTier: actingAs.promotionTier as 'non-vip' | 'vip',
        nationality: actingAs.nationality || 'American',
        isAdmin: false,
      };
    }

    if (user) {
      return {
        id: user.uid,
        name: profile?.displayName || user.displayName || 'You',
        profileImageUrl:
          profile?.photoURL ||
          user.photoURL ||
          getPlaceholderImage(user.uid),
        role: 'user',
        currentMood: 'Neutral',
        vipTier: currentTier as 'non-vip' | 'vip',
        nationality: profile?.nationality || 'American',
        isAdmin: !!isAdmin,
      };
    }

    return null;
  }, [actingAs, user, profile, profileVipTier, authVipTier, isAdmin]);

  // Add comment
  const handleAddComment = async (
    text: string,
    parentId: string | null = null
  ) => {
    if (!identity) {
      toast({
        variant: 'destructive',
        title: 'You must be logged in to comment.',
      });
      return;
    }

    try {
      const result = await addReelComment(reel.id, {
        postId: reel.id,
        text,
        parentId,
        author: identity,
        actorId: identity.id,
        actorType: identity.role === 'aigirl' ? 'girl' : 'user',
        realUserId: actingAs ? user?.uid : undefined,
        reactions: {},
        name: identity.name,
        profileImageUrl: identity.profileImageUrl,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save comment.');
      }

      // Update local count
      updateReelCommentCount(reel.id, 1);

    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Comment failed to save.',
        description: e.message,
      });
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!identity) return;

    try {
      const result = await deleteReelComment(reel.id, commentId, identity.id);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast({ title: 'Comment deleted' });
      
      // Update local count
      updateReelCommentCount(reel.id, -1);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting comment',
        description: error.message,
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <CommentInputForm
        onSubmit={(text) => handleAddComment(text)}
        disabled={isLocked || !identity}
      />

      <h4 className="font-semibold text-sm text-muted-foreground pt-4 border-t">
        Comments
      </h4>

      {comments && comments.length > 0 ? (
        comments
          .filter((c) => !c.parentId)
          .map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onDelete={handleDeleteComment}
              onReply={(text: string) => handleAddComment(text, comment.id)}
            />
          ))
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No comments yet.
        </p>
      )}
    </div>
  );
}

function CommentInputForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const { user } = useUser();
  const { profile } = useUserProfile();
  const { actingAs } = useAdminActingAs();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(text);
    setText('');
  };

  let avatarSrc =
    actingAs?.media?.profileImageUrl ??
    profile?.photoURL ??
    user?.photoURL ??
    '';
  let avatarFallback = actingAs?.name?.[0] ?? user?.displayName?.[0] ?? 'U';

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-2">
      <Avatar className="w-9 h-9">
        <AvatarImage src={avatarSrc} />
        <AvatarFallback>{avatarFallback}</AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder="Add a comment..."
          className="bg-secondary text-sm"
        />

        <div className="flex justify-end mt-2">
          <Button type="submit" size="sm" disabled={disabled || !text.trim()}>
            Post
          </Button>
        </div>
      </div>
    </form>
  );
}

function CommentCard({
  comment,
  onDelete,
  onReply,
}: {
  comment: Comment;
  onDelete: (id: string) => void;
  onReply: (text: string) => void;
}) {
  const { user, isAdmin } = useUser();
  const { actingAs } = useAdminActingAs();

  const actorId = actingAs?.id ?? user?.uid;
  const canDelete =
    isAdmin || (comment.author && comment.author.id === actorId);

  return (
    <div className="flex items-start gap-3">
      <Link
        href={
          comment.author?.id === actorId
            ? '/profile/me'
            : `/profile/${comment.author?.id}`
        }
      >
        <Avatar className="w-8 h-8">
          <AvatarImage src={comment.author?.profileImageUrl || ''} />
          <AvatarFallback>{comment.author?.name?.[0]}</AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <Link
              href={
                comment.author?.id === actorId
                  ? '/profile/me'
                  : `/profile/${comment.author?.id}`
              }
              className="font-semibold text-sm hover:underline"
            >
              {comment.author?.name}
            </Link>

            <span className="text-xs text-muted-foreground">
              <TimeAgo timestamp={comment.timestamp} />
            </span>
          </div>

          {canDelete && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-auto p-1">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full text-sm justify-start text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this comment.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>

                      <AlertDialogAction
                        onClick={() => onDelete(comment.id)}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <p className="text-sm mt-0.5 text-muted-foreground">
          {comment.text}
        </p>
      </div>
    </div>
  );
}
