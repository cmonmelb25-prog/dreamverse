'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader, Check } from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { followUser, unfollowUser } from '@/server/actions/user-follows';
import { useToast } from '@/hooks/use-toast';
import { doc } from '@/firebase/client';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  targetUserId: string;
  className?: string;
}

export function FollowButton({ targetUserId, className }: FollowButtonProps) {
  const { user, isLoading: isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);

  const followRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'following', targetUserId);
  }, [user?.uid, firestore, targetUserId]);

  const { data: followDoc, isLoading: isFollowLoading } = useDoc(
    followRef,
    user?.uid ? `users/${user.uid}/following/${targetUserId}` : null
  );

  if (isUserLoading || isFollowLoading) {
    return (
      <Button size="sm" className={className} disabled>
        <Loader className="h-3 w-3 animate-spin" />
      </Button>
    );
  }

  if (!user || user.uid === targetUserId) return null;

  const isFollowing = !!followDoc;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      if (isFollowing) {
        const res = await unfollowUser(targetUserId);
        if (!res.success) throw new Error(res.error);
      } else {
        const res = await followUser(targetUserId);
        if (!res.success) throw new Error(res.error);

        toast({
          title: 'Following!',
          description: 'You will now see their updates in your feed.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: err.message || 'Something went wrong.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      variant={isFollowing ? 'outline' : 'default'}
      size="sm"
      className={cn(className, isFollowing && "border-green-500/30 text-green-400 hover:bg-green-500/10")}
      disabled={isProcessing}
      onClick={handleToggle}
    >
      {isProcessing ? (
        <Loader className="h-3 w-3 animate-spin" />
      ) : isFollowing ? (
        <>
          <Check className="mr-1.5 h-3 w-3" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="mr-1.5 h-3 w-3" />
          Follow
        </>
      )}
    </Button>
  );
}
