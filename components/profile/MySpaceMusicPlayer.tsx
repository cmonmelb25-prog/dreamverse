'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Music as MusicIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useMusic } from '@/providers/MusicProvider';

/**
 * MYSPACE-STYLE MUSIC PLAYER (Global Controller)
 * PROTOCOL: Absolute Narrative Horizon (ANH).
 * STABILITY: Syncs with the global MusicProvider to persist playback across pages.
 * CONSENT: Starts idle. Music only loads when the user selects a track from the playlist.
 */
export function MySpaceMusicPlayer() {
  const { 
    currentTrack, 
    isPlaying, 
    progress, 
    volume, 
    togglePlay, 
    setVolume, 
    setProgress
  } = useMusic();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-inner relative overflow-hidden">
           <MusicIcon size={24} className={cn(isPlaying && "animate-pulse")} />
           {isPlaying && (
             <div className="absolute inset-0 bg-primary/10 animate-ping opacity-20" />
           )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            {isPlaying ? 'Now Playing' : (currentTrack ? 'Paused' : 'Ready')}
          </p>
          <p className="text-sm font-bold text-white truncate">
            {currentTrack?.title || 'Select a Track'}
          </p>
          <p className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">
            {currentTrack?.artist || 'Identity Records'}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <Slider 
          value={[progress]} 
          max={100} 
          step={0.1} 
          onValueChange={(vals) => setProgress(vals[0])}
          className="h-1.5"
          disabled={!currentTrack}
        />
        <div className="flex justify-between text-[8px] font-black text-white/20 uppercase tracking-widest">
           <span>Live Stream</span>
           <span>Global Link</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white" disabled={!currentTrack}><SkipBack size={16} /></Button>
          <button 
            onClick={togglePlay}
            disabled={!currentTrack}
            className={cn(
              "h-10 w-10 rounded-full transition-all shadow-lg active:scale-90 flex items-center justify-center",
              currentTrack ? "bg-white text-black hover:bg-primary hover:text-white" : "bg-white/10 text-white/20 cursor-not-allowed"
            )}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="translate-x-0.5" />}
          </button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white" disabled={!currentTrack}><SkipForward size={16} /></Button>
        </div>

        <div className="flex items-center gap-2 w-24">
           <Volume2 size={12} className="text-white/40" />
           <Slider 
             value={[volume * 100]} 
             max={100} 
             step={1} 
             onValueChange={(vals) => setVolume(vals[0] / 100)}
             className="h-1"
           />
        </div>
      </div>
    </div>
  );
}
