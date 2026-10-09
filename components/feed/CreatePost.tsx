'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useAdminActingAs } from '@/providers/AdminActingAsProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getPlaceholderImage } from '@/lib/placeholder';
import { useFeed } from '@/app/feed/FeedProvider';
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
import { Paperclip, Users, Images, X, Loader, Globe, ExternalLink } from 'lucide-react';
import { createPostAction } from '@/server/actions/create-post';
import { getLinkPreviewAction } from '@/server/actions/link-preview';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { cn, isValidMediaUrl } from '@/lib/utils';
import type { LinkPreview } from '@/lib/types';
import { AnimatePresence, motion } from 'framer-motion';

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select Media</DialogTitle>
          <DialogDescription>Choose an image or video from the character's gallery to attach to your post.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
            {media.map((url, index) => {
              const isVideo = url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.webm');
              return (
                <div
                  key={index}
                  className="relative aspect-square cursor-pointer group bg-secondary"
                  onClick={() => {
                    onSelectMedia(url);
                    onOpenChange(false);
                  }}
                >
                  {isVideo ? (
                     <video
                        src={url}
                        className="object-cover w-full h-full rounded-md"
                        playsInline
                        muted
                      />
                  ) : (
                    <Image
                      src={url}
                      alt={`Gallery media ${index + 1}`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                      className="object-cover rounded-md transition-transform group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-semibold">Select</span>
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

/**
 * PRODUCTION-GRADE CREATE POST COMPONENT
 * PROTOCOL: Absolute Narrative Horizon (ANH).
 * FEATURES: Hyper-Link Perception with Facebook-style previews.
 */
export function CreatePost() {
  const { user, profile, isAdmin } = useUser();
  const { actingAs, setActingAs } = useAdminActingAs();
  const { addPost } = useFeed();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [postContent, setPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastFetchedUrlRef = useRef<string | null>(null);

  /**
   * 🛡️ WEB SHARE TARGET INGRESS
   * Automatically ingests shared content from the system menu.
   */
  useEffect(() => {
    const sharedTitle = searchParams.get('title');
    const sharedText = searchParams.get('text');
    const sharedUrl = searchParams.get('url');

    if (sharedTitle || sharedText || sharedUrl) {
      let content = '';
      if (sharedTitle) content += sharedTitle + '\n';
      if (sharedText) content += sharedText + '\n';
      if (sharedUrl) content += sharedUrl;
      setPostContent(content);
    }
  }, [searchParams]);

  /**
   * 🛡️ DYNAMIC LINK PERCEPTION
   * Detects URLs in real-time and fetches high-fidelity previews.
   */
  useEffect(() => {
    const urlMatch = postContent.match(/(https?:\/\/[^\s]+)/i);
    const foundUrl = urlMatch ? urlMatch[0] : null;

    if (foundUrl && foundUrl !== lastFetchedUrlRef.current) {
      lastFetchedUrlRef.current = foundUrl;
      setIsPreviewLoading(true);
      getLinkPreviewAction(foundUrl).then(preview => {
        if (preview) setLinkPreview(preview);
        setIsPreviewLoading(false);
      }).catch(() => setIsPreviewLoading(false));
    } else if (!foundUrl) {
      setLinkPreview(null);
      lastFetchedUrlRef.current = null;
    }
  }, [postContent]);

  const handleSubmit = async () => {
    if ((!postContent && !selectedMediaUrl) || !user) return;

    setIsSubmitting(true);
    try {
      const result = await createPostAction({
        authorId: user.uid,
        actingAsId: actingAs ? actingAs.id : null,
        content: postContent,
        mediaUrl: selectedMediaUrl ?? undefined,
        linkPreview: linkPreview ?? undefined
      });

      if (!result.success || !result.post) {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to create post.' });
        return;
      }

      addPost(result.post);
      setPostContent('');
      setSelectedMediaUrl(null);
      setLinkPreview(null);
      toast({ title: 'Post created!' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetActingAs = (girl: any | null) => {
    if (!girl) {
      setActingAs(null);
      return;
    }
    const girlForContext = {
      ...girl,
      photoURL: getPlaceholderImage(girl.id),
      currentMood: Object.keys(girl.moods || {})[0] || 'Neutral',
    };
    setActingAs(girlForContext);
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
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      
      const text = await response.text();
      const result = text ? JSON.parse(text) : null;
      
      if (result?.success && result.url) setSelectedMediaUrl(result.url);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Upload failed' });
    } finally {
      setIsUploading(false);
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const actor = actingAs || user;
  if (!actor) return null;

  const actorName = actingAs ? actingAs.name : user?.displayName || "Anonymous";
  const actorImage = actingAs ? getPlaceholderImage(actingAs.id) : profile?.photoURL || user?.photoURL || "";

  return (
    <div className="mb-6 bg-card/60 backdrop-blur-sm border-accent/20 rounded-lg p-4">
      <div className="flex items-start gap-4">
        <Avatar>
          <AvatarImage src={actorImage || ""} />
          <AvatarFallback>{actorName.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="w-full">
          <Textarea
            id="post-content-textarea"
            name="content"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder={actingAs ? `Post as ${actingAs.name}...` : `What's on your mind, ${user?.displayName}?`}
            className="bg-secondary/50 border-border focus-visible:ring-primary min-h-[100px]"
          />
        </div>
      </div>

       {selectedMediaUrl && (
        <div className="mt-4 pl-16 relative">
          <div className="relative aspect-square max-w-[120px] rounded-md overflow-hidden bg-secondary">
             {selectedMediaUrl.includes('.mp4') ? (
              <video src={selectedMediaUrl} className="object-cover w-full h-full" muted playsInline />
            ) : (
              <Image src={selectedMediaUrl} alt="Selected media" fill sizes="120px" className="object-cover" />
            )}
          </div>
          <Button variant="ghost" size="icon" className="absolute top-0 left-16 -mt-2 -ml-2 h-6 w-6 rounded-full bg-black/50 text-white hover:bg-black/70 z-10" onClick={() => setSelectedMediaUrl(null)}><X className="h-4 w-4" /></Button>
        </div>
      )}

      {/* LINK PREVIEW PREVIEW */}
      <AnimatePresence>
        {linkPreview && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pl-16 overflow-hidden"
          >
             <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden shadow-xl relative group/preview max-w-sm">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute top-2 right-2 z-20 h-7 w-7 rounded-full bg-black/60 text-white hover:bg-red-500 transition-all opacity-0 group-hover/preview:opacity-100"
                  onClick={() => setLinkPreview(null)}
                >
                  <X size={14} />
                </Button>
                {linkPreview.image && (
                  <div className="relative aspect-video bg-zinc-900">
                     <img src={linkPreview.image} className="w-full h-full object-cover" alt="Preview" />
                  </div>
                )}
                <div className="p-4 space-y-1">
                   <p className="text-[10px] font-black uppercase text-primary tracking-widest">{linkPreview.siteName || 'Linked Reality'}</p>
                   <h4 className="text-sm font-bold text-white line-clamp-1">{linkPreview.title}</h4>
                   <p className="text-xs text-white/40 line-clamp-2">{linkPreview.description}</p>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isUploading && (
        <div className="mt-4 pl-16 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader className="h-4 w-4 animate-spin" />
            <span>Uploading...</span>
        </div>
      )}

      {isPreviewLoading && (
        <div className="mt-4 pl-16 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/40">
            <Globe className="h-3 w-3 animate-pulse" />
            <span>Scanning Link...</span>
        </div>
      )}

      <div className="mt-2 flex justify-between items-center">
        <div className="flex items-center gap-1">
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground"><Users className="h-5 w-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Act As</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[200px] w-48">
                  <DropdownMenuItem onSelect={() => handleSetActingAs(null)}>Clear (Act as Self)</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {allGirls.map(girl => (
                    <DropdownMenuItem key={girl.id} onSelect={() => handleSetActingAs(girl)}>{girl.name}</DropdownMenuItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
          <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => fileInputRef.current?.click()} disabled={isUploading}><Paperclip className="h-5 w-5" /></Button>

          {actingAs && (
            <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => setIsGalleryOpen(true)}><Images className="h-5 w-5" /></Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleSubmit} disabled={(!postContent && !selectedMediaUrl) || isSubmitting || isUploading || isPreviewLoading} className="animated-border-button">
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
