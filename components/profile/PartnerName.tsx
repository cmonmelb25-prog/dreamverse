'use client';

import { useEffect, useState } from 'react';
import { getRealUserClient } from '@/server/actions/get-real-user-client';
import { allGirls } from '@/lib/server/girls-data';

/**
 * Resolves a partner's name (AI girl or real user) from an ID.
 * Stable, cached, hydration-safe.
 */

// tiny in-memory cache to stop repeat fetch spam
const nameCache = new Map<string, string>();

export function PartnerName({ partnerId }: { partnerId: string }) {
  const [name, setName] = useState<string>('...');

  useEffect(() => {
    let alive = true;

    if (!partnerId) {
      setName('Unknown');
      return;
    }

    const normalizedId = partnerId.toLowerCase();

    // 1. Cache hit (instant)
    if (nameCache.has(normalizedId)) {
      setName(nameCache.get(normalizedId)!);
      return;
    }

    // 2. Static AI girls (instant lookup)
    const girlMatch = allGirls.find(
      (g) => g.id.toLowerCase() === normalizedId
    );

    if (girlMatch) {
      nameCache.set(normalizedId, girlMatch.name);
      setName(girlMatch.name);
      return;
    }

    // 3. Async real user fetch
    getRealUserClient(partnerId)
      .then((user) => {
        if (!alive) return;

        const resolved =
          user?.displayName ||
          user?.username ||
          'User';

        nameCache.set(normalizedId, resolved);
        setName(resolved);
      })
      .catch(() => {
        if (!alive) return;
        nameCache.set(normalizedId, 'Someone');
        setName('Someone');
      });

    return () => {
      alive = false;
    };
  }, [partnerId]);

  return <span>{name}</span>;
}