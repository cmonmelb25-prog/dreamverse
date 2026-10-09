
'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useAdminActingAs } from '@/providers/AdminActingAsProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getPlaceholderImage } from '@/lib/placeholder';
import { useFeed } from './FeedProvider';
import { allGirls } from '@/lib/server/girls-data';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Paperclip, Users, Images, X, Loader, Camera } from 'lucide-react';
import { createPostAction } from '@/server/actions/create-post';
import { ScrollArea } from '@/components/ui/scroll-area';
import { normalizeAIGirl } from '@/lib/normalizeAIGirl';

/**
 * Robust helper to detect if a URL points to a video, 
 * stripping query params for compatibility with signed URLs.
 */
const isVideoUrl = (url?: string | null) => {
  if (!url) return false;
  const path = url.split('?')[0].toLowerCase();
  return path.endsWith('.mp4') || path.endsWith('.mov') || path.endsWith('.webm');
};

// Image Gallery Dialog for selecting from character's previous images
function ImageGalleryDialog({
  open,
  onOpenChange,
  media,
  onSelectMedia,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: string[];
  onSelectMedia: (url: string) => void;
}) {
  const validMedia = media.filter(url => typeof url === 'string' && url.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select Media</DialogTitle>
          <DialogDescription>Choose an image or video from the character's gallery to attach to your post.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
            {validMedia.map((url, index) => {
              const isVideo = isVideoUrl(url);
              return (
                <div
                  key={index}
                  className="relative aspect-square cursor-pointer group bg-secondary rounded-md overflow-hidden"
                  onClick={() => {
                    onSelectMedia(url);
                    onOpenChange(false);
                  }}
                >
                  {isVideo ? (
                     <video
                        src={url}
                        className="object-cover w-full h-full"
                        playsInline
                        muted
                      />
                  ) : (
                    <img
                      src={url}
                      alt={`Gallery media ${index + 1}`}
                      className="object-cover w-full h-full transition-transform group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">Select</span>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function CreatePost() {
  const { user, profile, isAdmin } = useUser();
  const { actingAs, setActingAs } = useAdminActingAs();
  const { addPost } = useFeed();
  const { toast } = useToast();
  const [postContent, setPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if ((!postContent.trim() && !selectedMediaUrl) || !user) return;

    setIsSubmitting(true);
    try {
      const result = await createPostAction({
        authorId: user.uid,
        actingAsId: actingAs ? actingAs.id : null,
        content: postContent,
        mediaUrl: selectedMediaUrl ?? undefined,
      });

      if (!result.success || !result.post) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to create post.',
        });
        return;
      }

      addPost(result.post);
      setPostContent('');
      setSelectedMediaUrl(null);
      toast({ title: 'Post created!' });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetActingAs = (girl: any | null) => {
    if (!girl) {
      setActingAs(null);
      return;
    }
    const girlForContext = normalizeAIGirl(girl);
    setActingAs(girlForContext);
  };

  const triggerAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

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
        setSelectedMediaUrl(result.url);
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
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const actor = actingAs || user;
  if (!actor) return null;

  const actorName = actingAs ? actingAs.name : user?.displayName || "Anonymous";
  const actorImage = actingAs
    ? actingAs.media?.profileImageUrl || getPlaceholderImage(actingAs.id)
    : profile?.photoURL || user?.photoURL || "";

  const selectedMediaIsVideo = isVideoUrl(selectedMediaUrl);

  return (
    <div className="mb-6 bg-card/60 backdrop-blur-sm border border-white/5 rounded-2xl p-4 shadow-xl">
      <div className="flex items-start gap-4">
        <Avatar className="h-10 w-10 border border-white/10">
          <AvatarImage src={actorImage || ""} className="object-cover object-top" />
          <AvatarFallback>{actorName.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="w-full">
          <label htmlFor="post-content-area" className="sr-only">Post Content</label>
          <Textarea
            id="post-content-area"
            name="post-content"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder={
              actingAs
                ? `Post as ${actingAs.name}...`
                : `What's on your mind, ${user?.displayName || 'null'}?`
            }
            className="bg-black/20 border-white/10 focus-visible:ring-primary min-h-[100px] resize-none"
          />
        </div>
      </div>

       {selectedMediaUrl && (
        <div className="mt-4 pl-14 relative">
          <div className="relative w-full max-w-[240px] aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl group">
             {selectedMediaIsVideo ? (
              <video src={selectedMediaUrl} className="w-full h-full object-contain" muted playsInline />
            ) : (
              <img src={selectedMediaUrl} alt="Selected media" className="w-full h-full object-contain" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
            )}
            <button
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white hover:bg-red-500 transition-colors flex items-center justify-center backdrop-blur-md border border-white/10 z-10"
              onClick={() => setSelectedMediaUrl(null)}
              title="Remove media"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="mt-4 pl-14 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary animate-pulse">
            <Loader className="h-3 w-3 animate-spin" />
            <span>Uploading...</span>
        </div>
      )}

      <div className="mt-4 flex justify-between items-center pl-14">
        <div className="flex items-center gap-1">
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white/40 hover:text-primary transition-colors" title="Post as a Resident">
                  <Users className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="bg-black/90 backdrop-blur-xl border-white/10">
                <DropdownMenuLabel>Act As</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <ScrollArea className="h-[200px] w-48">
                  <DropdownMenuItem onSelect={() => handleSetActingAs(null)}>
                    Clear (Act as Self)
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {allGirls.map(girl => (
                    <DropdownMenuItem key={girl.id} onSelect={() => handleSetActingAs(girl)}>
                      {girl.name}
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
          
          <Button variant="ghost" size="icon" className="text-white/40 hover:text-primary transition-colors" onClick={triggerAttach} disabled={isUploading} title="Attach from Device">
            <Paperclip className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" className="text-white/40 hover:text-primary transition-colors" onClick={triggerAttach} title="Camera">
            <Camera className="h-5 w-5" />
          </Button>

          {actingAs && (
            <Button variant="ghost" size="icon" className="text-white/40 hover:text-primary transition-colors" onClick={() => setIsGalleryOpen(true)} title="Attach from Gallery">
              <Images className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSubmit}
            disabled={(!postContent.trim() && !selectedMediaUrl) || isSubmitting || isUploading}
            className="animated-border-button rounded-full px-6"
          >
            <span>{isSubmitting ? 'Posting...' : 'Post'}</span>
          </Button>
        </div>
      </div>

       {actingAs && (
        <ImageGalleryDialog
          open={isGalleryOpen}
          onOpenChange={setIsGalleryOpen}
          media={actingAs.media?.imageGallery ?? []}
          onSelectMedia={setSelectedMediaUrl}
        />
      )}
    </div>
  );
}
