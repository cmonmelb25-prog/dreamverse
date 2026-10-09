'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { useUser } from '@/firebase/auth/use-user';
import { useUserProfile } from '@/hooks/use-user-profile';

import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Eye, Upload, User, X, ShieldCheck, Move } from 'lucide-react';
import Link from 'next/link';
import { BackButton } from '@/components/back-button';
import { useToast } from '@/hooks/use-toast';

import { saveUserProfile } from '@/server/actions/user-actions';

import type { ProfileTheme } from '@/lib/themeTypes';
import { defaultTheme } from '@/lib/theme-constants';

import { ProfilePreview } from '@/components/profile/ThemeProfilePreview';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

import { RelationshipManager } from '@/components/profile/RelationshipManager';
import { SubscribePopup } from '@/components/SubscribePopup';
import { PresetPicker } from '@/components/profile/PresetPicker';
import { AdvancedThemeEditor } from '@/components/profile/AdvancedThemeEditor';
import { LayoutEditor } from '@/components/profile/LayoutEditor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SafeInitial } from '@/components/safe-initial';
import { safeImageUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),

  bio: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other']),

  age: z.coerce
    .number()
    .min(18, 'You must be at least 18')
    .refine((v) => !isNaN(v), 'Age is required'),

  location: z.string().min(1, 'Location is required'),
  nationality: z.string().min(1, 'Nationality is required'),

  profileImageUrl: z.string().optional().nullable(),

  theme: z.custom<ProfileTheme>(),

  galleryImages: z.string().optional().nullable(),
  galleryVideos: z.string().optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function MyProfileEditPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const { profile, isProfileLoading, isVip, isAdmin } = useUserProfile();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showVipPopup, setShowVipPopup] = useState(false);
  const [vipFeature, setVipFeature] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedRef = useRef(false);

  const canUseAdvanced = isVip || isAdmin;
  const [editorMode, setEditorMode] = useState<'simple' | 'advanced'>('simple');

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      username: '',
      bio: '',
      gender: 'male',
      age: 18,
      location: '',
      nationality: '',
      profileImageUrl: '',
      theme: defaultTheme,
      galleryImages: '',
      galleryVideos: '',
    },
  });

  useEffect(() => {
    if (profile && !hasLoadedRef.current) {
      form.reset({
        displayName: profile.displayName || '',
        username: profile.username || '',
        bio: profile.bio || '',
        gender: (profile as any).gender || 'male',
        age: profile.age ?? 18,
        location: profile.location || '',
        nationality: profile.nationality || '',
        profileImageUrl: profile.photoURL || '',
        theme: (profile.theme as ProfileTheme) || defaultTheme,
        galleryImages: profile.galleryImages?.join('\n') || '',
        galleryVideos: profile.galleryVideos?.join('\n') || '',
      });
      hasLoadedRef.current = true;
      if (canUseAdvanced) setEditorMode('advanced');
    }
  }, [profile, form, canUseAdvanced]);

  const watchedProfileImageUrl = form.watch('profileImageUrl');

  useEffect(() => {
    const currentThemeAvatar = form.getValues('theme.avatarUrl');
    if (watchedProfileImageUrl !== currentThemeAvatar) {
      form.setValue('theme.avatarUrl', watchedProfileImageUrl || undefined);
    }
  }, [watchedProfileImageUrl, form]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingAvatar(true);
    try {
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.uid);
      formData.append('idToken', idToken);
      formData.append('type', 'avatar');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();

      if (result.success && result.url) {
        form.setValue('profileImageUrl', result.url, { shouldDirty: true });
        toast({ title: 'Profile picture updated!' });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: err.message,
      });
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSave = async (data: ProfileFormValues) => {
    if (!user) return;

    setIsSaving(true);
    try {
      const result = await saveUserProfile({
        ...data,
        bio: data.bio ?? undefined,
        age: data.age ?? undefined,
        location: data.location ?? undefined,
        nationality: data.nationality ?? undefined,
        galleryImages: data.galleryImages ?? undefined,
        galleryVideos: data.galleryVideos ?? undefined,
        profileImageUrl: data.profileImageUrl || null,
      });

      if (!result.success) throw new Error(result.error);
      toast({ title: 'Identity Updated', description: 'Your profile has been saved to the DreamVerse.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVipClick = (feature?: string) => {
    setVipFeature(feature || 'premium themes');
    setShowVipPopup(true);
  };

  if (isUserLoading || (isProfileLoading && !hasLoadedRef.current)) {
    return <div className="flex h-screen items-center justify-center bg-background"><Loader /></div>;
  }

  const watchedTheme = form.watch('theme') || defaultTheme;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 h-screen w-screen overflow-hidden bg-background">
      <div className="h-full w-full overflow-y-auto flex flex-col no-scrollbar">
        <div className="p-6 max-w-xl mx-auto w-full pb-32">
          <div className="flex justify-between items-center mb-10">
            <BackButton />
            <Button variant="outline" asChild className="rounded-full border-white/10 hover:bg-white/5">
              <Link href="/profile/me"><Eye className="mr-2 h-4 w-4" /> View Profile</Link>
            </Button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-10">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold font-headline title-pulse-glow">Edit Identity</h1>
                <p className="text-white/40 text-xs font-black uppercase tracking-widest">Observatory Terminal v4.1</p>
              </div>

              {/* IDENTITY AVATAR BLOCK */}
              <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center gap-6 relative overflow-hidden group shadow-2xl">
                <div className="relative">
                  <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-2xl transition-transform group-hover:scale-105 duration-500">
                    <AvatarImage 
                      src={safeImageUrl(watchedProfileImageUrl) || undefined} 
                      className="object-cover" 
                      style={{ 
                        objectPosition: `${watchedTheme.avatarPosition?.x || 50}% ${watchedTheme.avatarPosition?.y || 50}%` 
                      }}
                    />
                    <AvatarFallback className="text-4xl bg-zinc-900"><SafeInitial characterName={form.getValues('displayName')} /></AvatarFallback>
                  </Avatar>
                  {isUploadingAvatar && <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm"><Loader className="animate-spin text-primary h-8 w-8" /></div>}
                  <button type="button" onClick={() => avatarInputRef.current?.click()} className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center border-4 border-background shadow-lg hover:scale-110 active:scale-95 transition-all"><Upload size={18} /></button>
                </div>
                <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />

                {/* MOVE TO FIT: AVATAR CONTROLS */}
                {watchedProfileImageUrl && (
                  <div className="w-full space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">
                       <Move size={12} className="text-primary" />
                       <span>Framing Adjustment</span>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="theme.avatarPosition.x"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <div className="flex justify-between">
                             <FormLabel className="text-[9px] font-black uppercase text-white/30">Horizontal Focal</FormLabel>
                             <span className="text-[9px] font-bold text-primary">{Math.round(field.value || 50)}%</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={0}
                              max={100}
                              step={1}
                              value={[field.value ?? 50]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="theme.avatarPosition.y"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                           <div className="flex justify-between">
                             <FormLabel className="text-[9px] font-black uppercase text-white/30">Vertical Focal</FormLabel>
                             <span className="text-[9px] font-bold text-primary">{Math.round(field.value || 50)}%</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={0}
                              max={100}
                              step={1}
                              value={[field.value ?? 50]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* COVER POSITIONING BLOCK */}
              {watchedTheme.coverUrl && (
                <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 space-y-6">
                    <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
                       <Move size={12} className="text-primary" />
                       <span>Cover Framing</span>
                    </div>

                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/5">
                        <img 
                          src={watchedTheme.coverUrl} 
                          className="w-full h-full object-cover" 
                          style={{ objectPosition: `50% ${watchedTheme.coverPosition?.y || 50}%` }}
                        />
                        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                    </div>

                    <FormField
                      control={form.control}
                      name="theme.coverPosition.y"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <div className="flex justify-between">
                             <FormLabel className="text-[9px] font-black uppercase text-white/30">Adjust Vertical Crop</FormLabel>
                             <span className="text-[9px] font-bold text-primary">{Math.round(field.value || 50)}%</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={0}
                              max={100}
                              step={1}
                              value={[field.value ?? 50]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                          </FormControl>
                          <FormDescription className="text-[9px] italic">Slide to move the cover up or down within the frame.</FormDescription>
                        </FormItem>
                      )}
                    />
                </div>
              )}

              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80 px-1">Basic Protocols</h3>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="displayName" render={({ field }) => (
                    <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input placeholder="Name" {...field} className="bg-white/5 border-white/10" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem><FormLabel>Username</FormLabel><FormControl><Input placeholder="username" {...field} className="bg-white/5 border-white/10" /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="bio" render={({ field }) => (
                <FormItem><FormLabel>Bio</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} className="bg-white/5 border-white/10 min-h-[120px] rounded-2xl" /></FormControl><FormMessage /></FormItem>)} />
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="age" render={({ field }) => (
                  <FormItem><FormLabel>Age</FormLabel><FormControl><Input {...field} type="number" className="bg-white/5 border-white/10" /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="nationality" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>Nationality</FormLabel><FormControl><Input placeholder="Nationality" {...field} className="bg-white/5 border-white/10" /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80">Cinematic Engine</h3>
                   {canUseAdvanced && (
                     <div className="flex bg-white/5 p-1 rounded-full gap-1 border border-white/5">
                        <button type="button" onClick={() => setEditorMode('simple')} className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", editorMode === 'simple' ? "bg-primary text-white" : "text-white/40 hover:text-white")}>Simple</button>
                        <button type="button" onClick={() => setEditorMode('advanced')} className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5", editorMode === 'advanced' ? "bg-primary text-white" : "text-white/40 hover:text-white")}><ShieldCheck size={10} /> Advanced</button>
                     </div>
                   )}
                </div>

                <FormField control={form.control} name="theme" render={({ field }) => (
                  <FormItem>
                    {editorMode === 'advanced' && canUseAdvanced ? (
                      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2">
                        <AdvancedThemeEditor form={form} />
                        <LayoutEditor form={form} isVIP={canUseAdvanced} onVipClickAction={handleVipClick} />
                      </div>
                    ) : (
                      <PresetPicker isVIP={canUseAdvanced} value={field.value || defaultTheme} onChangeAction={field.onChange} onVipClickAction={handleVipClick} />
                    )}
                  </FormItem>
                )} />
              </div>

              <RelationshipManager />

              <div className="pt-10">
                <Button type="submit" disabled={isSaving} className="w-full h-14 rounded-[2rem] animated-border-button shadow-2xl font-black uppercase tracking-[0.2em] relative z-50">
                  {isSaving ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSaving ? 'Synching...' : 'Commit Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>

      <div className="hidden lg:block relative h-full">
         <div className="sticky top-0 h-screen w-full overflow-hidden border-l border-white/5 shadow-inner">
            <ProfilePreview theme={watchedTheme as ProfileTheme} />
         </div>
      </div>

      <SubscribePopup open={showVipPopup} onOpenChangeAction={setShowVipPopup} feature={vipFeature} />
    </div>
  );
}
