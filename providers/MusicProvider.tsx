'use client';

import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';

/**
 * @fileOverview Global Audio Synchronization Engine.
 * PROTOCOL: Absolute Narrative Horizon (ANH). No string-reduction logic.
 * PERSISTENCE: Manages root-level audio that survives navigation and lock-screen.
 * CONSENT: Starts strictly silent. Auto-play on mount removed to respect user hearing safety.
 */

interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  cover?: string | null;
}

interface MusicContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  volume: number;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  setVolume: (v: number) => void;
  setProgress: (p: number) => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 🛡️ BACKGROUND ENGINE: Media Session API for Lock Screen
  useEffect(() => {
    if (!currentTrack || typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const artwork = currentTrack.cover 
      ? [{ src: currentTrack.cover, sizes: '512x512', type: 'image/jpeg' }]
      : [{ src: 'https://i.imgur.com/agK0Phc.png', sizes: '512x512', type: 'image/png' }];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      artwork
    });

    navigator.mediaSession.setActionHandler('play', () => togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => togglePlay());
    
    return () => {
      navigator.mediaSession.metadata = null;
    };
  }, [currentTrack]);

  // 🛡️ AUDIO INSTANCE MANAGEMENT
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playTrack = (track: Track) => {
    if (!audioRef.current) return;
    
    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }

    setCurrentTrack(track);
    audioRef.current.src = track.url;
    audioRef.current.play().catch(e => console.warn("[Music] Auto-play deferred until user interaction."));
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSetProgress = (p: number) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const time = (p / 100) * audioRef.current.duration;
    audioRef.current.currentTime = time;
    setProgress(p);
  };

  return (
    <MusicContext.Provider value={{
      currentTrack,
      isPlaying,
      progress,
      volume,
      playTrack,
      togglePlay,
      setVolume,
      setProgress: handleSetProgress
    }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used within MusicProvider');
  return ctx;
}
