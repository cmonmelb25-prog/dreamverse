'use client';
import ReelsClient from './ReelsClient';
import { getReels } from '@/server/actions/get-reels';
import { Loader } from '@/components/ui/loader';
import { useEffect, useState } from 'react';
import type { Reel } from '@/lib/types';
import { ReelsProvider } from '@/context/ReelsContext';

/**
 * REELS FEED PAGE
 * FIXED: Uses h-dvh for immersive full-screen scrolling and reliable observer events.
 */
export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReels({})
      .then(({ reels, error }) => {
        if (error) {
          setError(error);
        } else {
          setReels(reels || []);
        }
      })
      .catch((err) => {
        setError('An unexpected error occurred.');
      });
  }, []);

  if (error) {
    return (
      <div className="text-destructive text-center p-4 h-full flex items-center justify-center">
        {error}
      </div>
    );
  }

  if (!reels) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-black">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh overflow-hidden theme-reels bg-black">
      <main className="flex-1 overflow-hidden">
        <ReelsProvider initialReels={reels}>
          <ReelsClient />
        </ReelsProvider>
      </main>
    </div>
  );
}
