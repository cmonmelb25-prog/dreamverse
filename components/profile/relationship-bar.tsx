'use client';

import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { useFirestore } from '@/firebase/provider';
import { useUser } from '@/firebase/auth/use-user';
import { doc } from "@/firebase/client";
import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getRelationshipLevelInfo } from "@/lib/relationship-levels";
import { initializeRelationship } from "@/lib/relationships";
import { normalizeRelationship } from "@/lib/normalizeRelationship";
import type { Relationship } from "@/lib/types";

/**
 * Relationship progress bar.
 * FIX: Stable hydration-safe relationship latch (no flicker overwrite).
 */
export function RelationshipBar({ girlId }: { girlId: string }) {
  const { user } = useUser();
  const firestore = useFirestore();

  /* -------------------------------------------------------------------------- */
  /* FIRESTORE REF                                                             */
  /* -------------------------------------------------------------------------- */

  const userGirlRelationshipRef = useMemoFirebase(() => {
    if (!user?.uid || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'relationships', girlId);
  }, [firestore, user?.uid, girlId]);

  const { data: relationshipRaw, isLoading } = useDoc<any>(
    userGirlRelationshipRef,
    user?.uid ? `users/${user.uid}/relationships/${girlId}` : null
  );

  /* -------------------------------------------------------------------------- */
  /* STABLE RELATIONSHIP RESOLUTION (NO OVERWRITE DURING LOAD)                 */
  /* -------------------------------------------------------------------------- */

  const relationship = useMemo<Relationship>(() => {
    if (!relationshipRaw) {
      return initializeRelationship();
    }

    const normalized = normalizeRelationship(relationshipRaw);

    return {
      ...initializeRelationship(),
      ...normalized,
    };
  }, [relationshipRaw]);

  /* -------------------------------------------------------------------------- */
  /* LOADING STATE                                                             */
  /* -------------------------------------------------------------------------- */

  if (isLoading && !relationshipRaw) {
    return (
      <div className="mt-6 space-y-4">
        <Skeleton className="h-4 w-1/3 mb-1" />
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-4 w-1/3 mb-1 mt-2" />
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-4 w-1/3 mb-1 mt-2" />
        <Skeleton className="h-2.5 w-full" />
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* SAFE EXTRACTION                                                           */
  /* -------------------------------------------------------------------------- */

  const stats = {
    confidence: relationship.relationshipStats?.confidence ?? 0,
    interest: relationship.relationshipStats?.interest ?? 0,
  };

  const isOfficial = relationship.isOfficial === true;

  const xp = typeof relationship.xp === 'number'
    ? relationship.xp
    : 0;

  const levelInfo = getRelationshipLevelInfo(xp, isOfficial);

  /* -------------------------------------------------------------------------- */
  /* UI                                                                        */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="mt-6 space-y-4">

      {/* TIER + XP */}
      <div>
        <div className="flex justify-between mb-1 text-sm text-muted-foreground">
          <span className="font-medium text-primary capitalize">
            {relationship.relationshipTier}
          </span>
          <span>
            {levelInfo.xpProgress} / {levelInfo.xpToNextLevel} XP
          </span>
        </div>

        <Progress
          value={levelInfo.progressPercentage}
          className="h-2.5 transition-all duration-300"
        />

        <p className="text-xs text-muted-foreground mt-1 text-right">
          {levelInfo.isMaxLevel
            ? 'Max Level'
            : `${levelInfo.xpToNextLevel - levelInfo.xpProgress} XP to next level`}
        </p>
      </div>

      {/* CONFIDENCE */}
      <div>
        <div className="flex justify-between mb-1 text-xs text-muted-foreground">
          <span>Confidence</span>
          <span>{stats.confidence}/100</span>
        </div>
        <Progress value={stats.confidence} className="h-2.5 transition-all duration-300" />
      </div>

      {/* INTEREST */}
      <div>
        <div className="flex justify-between mb-1 text-xs text-muted-foreground">
          <span>Interest</span>
          <span>{stats.interest}/100</span>
        </div>
        <Progress value={stats.interest} className="h-2.5 transition-all duration-300" />
      </div>

    </div>
  );
}