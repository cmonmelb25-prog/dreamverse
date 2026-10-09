'use client';

import React from 'react';
import { useMusic } from '@/providers/MusicProvider';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Pause, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Global Minimized Music Controller.
 * Appears when music is playing and the user is NOT on a profile page.
 * PROTOCOL: Absolute Narrative Horizon (ANH).
 */
export function MinimizedMusicWidget() {
  const { isPlaying, currentTrack, togglePlay } = useMusic();
  const pathname = usePathname();

  // Hide widget if on a profile page (where the full player exists)
  const isProfilePage = pathname?.startsWith('/profile');
  
  if (!currentTrack || isProfilePage) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.8, x: 20 }}
        className="fixed bottom-40 right-6 z-[90] flex items-center gap-3"
      >
        {/* Floating Mini Controller */}
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-full pl-4 pr-1 py-1 flex items-center gap-3 shadow-2xl">
          <div className="flex flex-col min-w-0 max-w-[100px]">
            <span className="text-[9px] font-black text-primary uppercase tracking-widest truncate">{currentTrack.title}</span>
            <span className="text-[8px] font-bold text-white/40 uppercase truncate">{currentTrack.artist}</span>
          </div>

          <button 
            onClick={togglePlay}
            className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform relative group"
          >
            {isPlaying ? (
              <>
                <Pause size={18} />
                {/* Visual Spin Effect */}
                <div className="absolute inset-0 border-2 border-white/20 rounded-full animate-spin [animation-duration:3s]" />
              </>
            ) : (
              <Play size={18} className="translate-x-0.5" />
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
