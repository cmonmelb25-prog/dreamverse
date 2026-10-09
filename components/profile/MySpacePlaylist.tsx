'use client';

import React, { useState, useRef } from 'react';
import { Play, ListMusic, Plus, Loader, Globe, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { useMusic } from '@/providers/MusicProvider';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';
import { savePlaylistAction } from '@/server/actions/user-actions';
import type { Track } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * SAVED PLAYLIST BLOCK
 * High-fidelity MySpace-inspired tracklist with Add Track functionality.
 * Supports both direct URL links and MP3/WAV uploads.
 */
export function MySpacePlaylist({ 
  profileId, 
  initialPlaylist = [] 
}: { 
  profileId: string, 
  initialPlaylist?: Track[] 
}) {
  const { user } = useUser();
  const { playTrack, currentTrack, isPlaying } = useMusic();
  const { toast } = useToast();
  
  const [playlist, setPlaylist] = useState<Track[]>(initialPlaylist.length > 0 ? initialPlaylist : [
    { id: '1', title: 'Solar Flare', artist: 'Nova', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: '2', title: 'Digital Rain', artist: 'The Architect', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  ]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    url: ''
  });

  const isOwner = user?.uid === profileId;

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.url) return;

    setIsSubmitting(true);
    try {
      const newTrack: Track = {
        id: crypto.randomUUID(),
        title: formData.title,
        artist: formData.artist || 'Unknown Artist',
        url: formData.url,
      };

      const updatedPlaylist = [...playlist, newTrack];
      
      if (isOwner && user) {
        const result = await savePlaylistAction(user.uid, updatedPlaylist);
        if (!result.success) throw new Error(result.error);
      }

      setPlaylist(updatedPlaylist);
      setIsAddModalOpen(false);
      setFormData({ title: '', artist: '', url: '' });
      toast({ title: 'Track added to playlist!' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error saving playlist', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Support only audio types
    if (!file.type.startsWith('audio/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload an audio file (MP3, WAV).' });
        return;
    }

    setIsUploading(true);
    try {
      const idToken = await user.getIdToken();
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('userId', user.uid);
      formDataUpload.append('idToken', idToken);
      formDataUpload.append('type', 'post'); // Using existing generic upload path

      const res = await fetch('/api/upload', { method: 'POST', body: formDataUpload });
      const text = await res.text();
      const result = text ? JSON.parse(text) : null;

      if (result?.success) {
        setFormData(prev => ({ 
            ...prev, 
            url: result.url,
            title: prev.title || file.name.split('.')[0]
        }));
        toast({ title: 'Audio uploaded!' });
      } else {
        throw new Error(result?.error || 'Upload failed');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  const removeTrack = async (trackId: string) => {
    if (!isOwner || !user) return;
    const updated = playlist.filter(t => t.id !== trackId);
    try {
        const result = await savePlaylistAction(user.uid, updated);
        if (result.success) {
            setPlaylist(updated);
            toast({ title: 'Track removed' });
        }
    } catch (e) {}
  };

  return (
    <div className="bg-white/5 border border-white/5 rounded-[1.5rem] p-4 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
         <div className="flex items-center gap-2">
            <ListMusic size={14} className="text-primary" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Playlist</h3>
         </div>
         <div className="flex items-center gap-3">
            <span className="text-[8px] font-bold text-white/20 uppercase">{playlist.length} Tracks</span>
            {isOwner && (
               <button 
                onClick={() => setIsAddModalOpen(true)}
                className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"
               >
                  <Plus size={12} />
               </button>
            )}
         </div>
      </div>

      <div className="space-y-1">
        {playlist.map((track, idx) => {
          const isActive = currentTrack?.id === track.id;
          
          return (
            <div 
              key={track.id} 
              className={cn(
                "flex items-center justify-between p-2 rounded-xl transition-all group cursor-pointer border border-transparent",
                isActive ? "bg-primary/10 border-primary/20 shadow-lg" : "hover:bg-white/5"
              )}
              onClick={() => playTrack(track)}
            >
              <div className="flex items-center gap-3 min-w-0">
                 <span className={cn("text-[10px] font-black w-4", isActive ? "text-primary" : "text-white/20")}>
                    {idx + 1}
                 </span>
                 <div className="min-w-0">
                    <p className={cn("text-xs font-bold truncate transition-colors", isActive ? "text-primary" : "text-white/90 group-hover:text-primary")}>
                      {track.title}
                    </p>
                    <p className="text-[9px] font-medium text-white/30 uppercase tracking-tighter">{track.artist}</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 {isActive && isPlaying ? (
                    <div className="flex items-end gap-0.5 h-3">
                        <div className="w-0.5 bg-primary animate-[bounce_0.6s_infinite]" />
                        <div className="w-0.5 bg-primary animate-[bounce_0.8s_infinite]" />
                        <div className="w-0.5 bg-primary animate-[bounce_0.5s_infinite]" />
                    </div>
                 ) : (
                    <Play size={10} className={cn("text-primary transition-opacity", isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
                 )}
                 {isOwner && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }}
                        className="opacity-0 group-hover:opacity-40 hover:!opacity-100 text-red-500 transition-opacity"
                    >
                        <X size={10} />
                    </button>
                 )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD TRACK DIALOG */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-white/10 p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
          <form onSubmit={handleAddTrack}>
            <DialogHeader className="p-8 bg-black/40 border-b border-white/5">
              <DialogTitle className="text-3xl font-bold font-headline">Add Track</DialogTitle>
              <DialogDescription className="text-white/40">
                Expand your musical identity in the DreamVerse.
              </DialogDescription>
            </DialogHeader>

            <div className="p-8 space-y-6">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-white/40 px-1">Track Title</Label>
                  <Input 
                    placeholder="Song Name" 
                    className="bg-white/5 border-white/10 h-11 rounded-xl"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    required
                  />
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-white/40 px-1">Artist</Label>
                  <Input 
                    placeholder="Creator Name" 
                    className="bg-white/5 border-white/10 h-11 rounded-xl"
                    value={formData.artist}
                    onChange={e => setFormData({...formData, artist: e.target.value})}
                  />
               </div>

               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-white/40 px-1">Audio Source</Label>
                  <div className="flex gap-2">
                     <Input 
                        placeholder="Direct URL (MP3/WAV)..." 
                        className="bg-white/5 border-white/10 h-11 rounded-xl flex-1"
                        value={formData.url}
                        onChange={e => setFormData({...formData, url: e.target.value})}
                        required
                     />
                     <Button 
                        type="button" 
                        variant="secondary" 
                        className="h-11 w-11 rounded-xl shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                     >
                        {isUploading ? <Loader className="animate-spin h-4 w-4" /> : <Upload size={16} />}
                     </Button>
                     <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleFileUpload} />
                  </div>
                  <p className="text-[9px] text-white/20 italic px-1">Paste a link or upload an audio file directly to the observatory.</p>
               </div>
            </div>

            <DialogFooter className="p-8 bg-black/40 border-t border-white/5">
              <Button type="submit" disabled={isSubmitting || isUploading} className="w-full h-12 rounded-2xl animated-border-button font-black uppercase tracking-widest text-[10px]">
                {isSubmitting ? <Loader className="animate-spin h-4 w-4 mr-2" /> : <Plus size={14} className="mr-2" />}
                Add to Playlist
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
