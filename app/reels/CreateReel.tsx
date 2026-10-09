'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { useUser } from '@/firebase/auth/use-user';
import { createReel as createReelAction } from '@/server/actions/create-reel';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, Film, Loader, X, Link as LinkIcon } from 'lucide-react';
import { useAdminActingAs } from '@/providers/AdminActingAsProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getPlaceholderImage } from '@/lib/placeholder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * HARDENED: Create Reel Component
 * Support for both direct file uploads and external Video URLs.
 */
export default function CreateReel() {
  const { user } = useUser();
  const { toast } = useToast();
  const { actingAs } = useAdminActingAs();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [caption, setCaption] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim() || !user) {
      toast({ variant: 'destructive', title: 'A video source is required.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createReelAction({
        videoUrl: videoUrl.trim(),
        caption,
        actingAsId: actingAs?.id ?? null,
        userId: user.uid,
      });

      if (result.success) {
        toast({ title: 'Reel Created!' });
        setCaption('');
        setVideoUrl('');
        // Force refresh to show new reel in the feed immediately
        window.location.reload();
      } else {
        throw new Error(result.error || 'Failed to create reel.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    
    // Support for video/quicktime (.mov) and standard mp4/webm
    if (!file.type.startsWith('video/') && file.type !== 'video/quicktime') {
        toast({
            variant: 'destructive',
            title: 'Invalid File Type',
            description: 'Please upload a video file (.mp4, .mov, etc).',
        });
        return;
    }

    setIsUploading(true);
    try {
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.uid);
      formData.append('idToken', idToken);
      formData.append('type', 'post'); 
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (result.success && result.url) {
        setVideoUrl(result.url);
      } else {
        throw new Error(result.error || 'File upload failed.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: error.message,
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!user) {
    return (
      <div className="py-4 text-center text-muted-foreground">
        <p>You must be logged in to create a reel.</p>
        <Link href="/auth/signin">
          <Button variant="link" className="text-primary">Log In</Button>
        </Link>
      </div>
    );
  }

  const actorName = actingAs ? actingAs.name : user.displayName;
  const actorImage = actingAs
    ? getPlaceholderImage(actingAs.id)
    : user?.photoURL ?? "";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border border-white/10 shadow-lg">
          <AvatarImage src={actorImage || ""} className="object-cover object-top" />
          <AvatarFallback>{actorName?.charAt(0) ?? '?'}</AvatarFallback>
        </Avatar>
        <div className="text-sm">
          <p className="font-bold text-white">{actorName}</p>
          {actingAs && (
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Acting as Resident</p>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        <Tabs defaultValue="upload" className="w-full" onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid grid-cols-2 bg-black/40 border border-white/5 p-1 rounded-xl h-11">
            <TabsTrigger value="upload" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-xs uppercase tracking-widest transition-all">
              <Upload className="mr-2 h-4 w-4" /> Upload
            </TabsTrigger>
            <TabsTrigger value="link" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-xs uppercase tracking-widest transition-all">
              <LinkIcon className="mr-2 h-4 w-4" /> Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            {!videoUrl ? (
              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-32 border-dashed border-white/10 bg-black/20 hover:bg-black/40 hover:border-primary/50 transition-all group" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isSubmitting}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader className="animate-spin text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Processing...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Film className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-muted-foreground group-hover:text-white transition-colors">Select Video File</span>
                  </div>
                )}
              </Button>
            ) : (
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                <video 
                  src={videoUrl} 
                  className="w-full h-full object-contain" 
                  muted 
                  playsInline
                  autoPlay
                  loop
                />
                <Button 
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg"
                  onClick={() => setVideoUrl('')}
                  disabled={isSubmitting || isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="link" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="video-url" className="text-[10px] font-black uppercase tracking-widest text-white/40">Direct Video URL</Label>
              <div className="flex gap-2">
                <Input
                  id="video-url"
                  placeholder="https://example.com/video.mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="bg-black/20 border-white/10 focus-visible:ring-primary h-11"
                  disabled={isSubmitting || isUploading}
                />
                {videoUrl && (
                  <Button variant="ghost" size="icon" onClick={() => setVideoUrl('')} className="shrink-0 h-11 w-11 rounded-xl">
                    <X size={18} />
                  </Button>
                )}
              </div>
            </div>

            {videoUrl && videoUrl.startsWith('http') && (
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                <video 
                  src={videoUrl} 
                  className="w-full h-full object-contain" 
                  muted 
                  playsInline
                  autoPlay
                  loop
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-2">
        <Label htmlFor="caption" className="text-[10px] font-black uppercase tracking-widest text-white/40">Caption</Label>
        <Textarea
          id="caption"
          placeholder="Share something about this moment..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="bg-black/20 border-white/10 min-h-[100px] focus-visible:ring-primary"
          disabled={isSubmitting || isUploading}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isSubmitting || isUploading || !videoUrl.trim()}
          className="animated-border-button h-12 px-8"
        >
          {isSubmitting ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              <span>Publishing...</span>
            </>
          ) : (
            <>
              <Film className="mr-2 h-4 w-4" />
              <span className="font-bold uppercase tracking-widest">Publish Reel</span>
            </>
          )}
        </Button>
      </div>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="video/*" 
        disabled={isUploading || isSubmitting}
      />
    </form>
  );
}
