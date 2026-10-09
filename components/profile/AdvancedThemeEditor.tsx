'use client';

import React, { useEffect } from 'react';
import { type UseFormReturn } from 'react-hook-form';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FormField, FormControl, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { 
  borderStyles, 
  layouts, 
  animatedEffects, 
  defaultTheme, 
  preMadeAnimatedBackgrounds 
} from '@/lib/theme-constants';
import { Palette, Image as ImageIcon, Video, Zap, Layout } from 'lucide-react';

type ThemeEditorProps = {
  form: UseFormReturn<any>;
};

export function AdvancedThemeEditor({ form }: ThemeEditorProps) {
  const { control, watch, setValue } = form;
  const theme = watch('theme');

  const backgroundType = watch('theme.backgroundType') || 'solid';

  useEffect(() => {
    if (!theme || typeof theme !== 'object') {
      setValue('theme', defaultTheme, { shouldDirty: true });
    }
  }, [theme, setValue]);

  return (
    <div className="space-y-12">
      {/* BACKGROUND ORCHESTRATOR */}
      <section className="space-y-6 bg-white/5 p-6 rounded-[2rem] border border-white/5 shadow-2xl">
        <div className="flex items-center gap-3 px-1">
           <Palette className="text-primary h-5 w-5" />
           <h3 className="font-headline text-xl text-white uppercase tracking-tight">Environment Engine</h3>
        </div>

        <FormField
          control={control}
          name="theme.backgroundType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Atmosphere Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || 'solid'}>
                <FormControl>
                  <SelectTrigger className="bg-black/20 border-white/10 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent className="bg-zinc-900 border-white/10">
                   <SelectItem value="solid">Solid Color</SelectItem>
                   <SelectItem value="gradient">Gradient Blend</SelectItem>
                   <SelectItem value="animated">Pre-made Animated</SelectItem>
                   <SelectItem value="image">Custom Image URL</SelectItem>
                   <SelectItem value="video">Custom Video URL</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <div className="animate-in fade-in slide-in-from-top-2 duration-500">
           {backgroundType === 'solid' && (
             <FormField
               control={control}
               name="theme.backgroundValue"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Choose Color</FormLabel>
                   <FormControl>
                     <div className="flex gap-3">
                        <Input type="color" className="w-16 h-11 p-1 bg-black/20 border-white/10 rounded-xl" {...field} />
                        <Input type="text" className="flex-1 h-11 bg-black/20 border-white/10 rounded-xl font-mono text-sm" {...field} />
                     </div>
                   </FormControl>
                 </FormItem>
               )}
             />
           )}

           {backgroundType === 'gradient' && (
             <FormField
               control={control}
               name="theme.backgroundValue"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Gradient Logic</FormLabel>
                   <FormControl>
                     <Input placeholder="linear-gradient(to right, #ff0084, #6a00f4)" className="h-11 bg-black/20 border-white/10 rounded-xl font-mono text-sm" {...field} />
                   </FormControl>
                   <FormDescription className="text-[9px] italic">Enter a CSS linear-gradient string.</FormDescription>
                 </FormItem>
               )}
             />
           )}

           {backgroundType === 'animated' && (
             <FormField
               control={control}
               name="theme.backgroundValue"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Atmospheric Presets</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}>
                     <FormControl>
                       <SelectTrigger className="bg-black/20 border-white/10 h-11 rounded-xl"><SelectValue placeholder="Select atmosphere..." /></SelectTrigger>
                     </FormControl>
                     <SelectContent className="bg-zinc-900 border-white/10">
                        {preMadeAnimatedBackgrounds.map(bg => (
                          <SelectItem key={bg.id} value={bg.id}>{bg.name}</SelectItem>
                        ))}
                     </SelectContent>
                   </Select>
                 </FormItem>
               )}
             />
           )}

           {(backgroundType === 'image' || backgroundType === 'video') && (
             <FormField
               control={control}
               name="theme.backgroundValue"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Media Source URL</FormLabel>
                   <FormControl>
                     <div className="relative">
                        <Input placeholder="https://i.imgur.com/xyz.mp4" className="h-11 bg-black/20 border-white/10 rounded-xl pl-10" {...field} />
                        {backgroundType === 'video' ? <Video size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" /> : <ImageIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />}
                     </div>
                   </FormControl>
                   <FormDescription className="text-[9px] italic">Provide a direct link to the {backgroundType} file.</FormDescription>
                 </FormItem>
               )}
             />
           )}
        </div>
      </section>

      {/* COLUMN ORCHESTRATOR SELECTION */}
      <section className="bg-white/5 p-6 rounded-[2rem] border border-white/5 shadow-xl space-y-6">
        <div className="flex items-center gap-3 px-1">
           <Layout className="text-primary h-5 w-5" />
           <h3 className="font-headline text-xl text-white uppercase tracking-tight">Perspective Layout</h3>
        </div>

        <FormField
          control={control}
          name="theme.layout"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase tracking-widest text-white/40">Column Architecture</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || 'classic'}>
                <FormControl>
                  <SelectTrigger className="bg-black/20 border-white/10 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent className="bg-zinc-900 border-white/10">
                   {layouts.map(l => (
                     <SelectItem key={l} value={l} className="capitalize">{l.replace(/-/g, ' ')}</SelectItem>
                   ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </section>

      {/* TYPOGRAPHY & ACCENTS */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 shadow-xl space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80">Identity Aesthetics</h3>
            
            <FormField
              control={control}
              name="theme.fontFamily"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[9px] font-black uppercase tracking-widest text-white/30">Font Protocol</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'Inter'}>
                    <FormControl>
                      <SelectTrigger className="bg-black/20 border-white/10 h-10 rounded-lg"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {['Inter', 'Poppins', 'Orbitron', 'Lora', 'Playfair Display', 'Pacifico'].map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="theme.fontColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-black uppercase tracking-widest text-white/30">Text Tone</FormLabel>
                      <FormControl><Input type="color" className="w-full h-10 p-1 bg-black/20 border-white/10" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="theme.themeColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-black uppercase tracking-widest text-white/30">Accent Glow</FormLabel>
                      <FormControl><Input type="color" className="w-full h-10 p-1 bg-black/20 border-white/10" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
            </div>
          </div>

          <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 shadow-xl space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80">VFX Intensity</h3>
            
            <FormField
              control={control}
              name="theme.overlayStrength"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between mb-2">
                    <FormLabel className="text-[9px] font-black uppercase tracking-widest text-white/30">Atmospheric Density</FormLabel>
                    <span className="text-[10px] font-bold text-primary">{Math.round((field.value || 0.5) * 100)}%</span>
                  </div>
                  <FormControl>
                    <Slider min={0} max={0.9} step={0.05} value={[field.value ?? 0.5]} onValueChange={(v) => field.onChange(v[0])} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="theme.borderStyle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[9px] font-black uppercase tracking-widest text-white/30">Container Framing</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'rounded'}>
                    <FormControl><SelectTrigger className="bg-black/20 border-white/10 h-10 rounded-lg"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{borderStyles.map(bs => <SelectItem key={bs} value={bs} className="capitalize">{bs}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
      </section>

      {/* FX TOGGLES */}
      <section className="bg-white/5 p-6 rounded-[2rem] border border-white/5 shadow-xl">
        <div className="flex items-center gap-2 mb-6">
           <Zap className="text-primary h-4 w-4" />
           <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">Hardware Accelerated Effects</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['glow', 'shadow', 'blur', 'rounded'].map(effect => (
            <FormField
              key={effect}
              control={control}
              name={`theme.effects.${effect}`}
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 transition-all hover:border-primary/30">
                  <FormLabel className="capitalize text-xs font-bold text-white/60">{effect}</FormLabel>
                  <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} className="scale-75" /></FormControl>
                </FormItem>
              )}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
