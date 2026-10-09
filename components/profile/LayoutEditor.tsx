'use client';

import { type UseFormReturn } from 'react-hook-form';
import { FormField, FormControl } from '@/components/ui/form';
import { EffectsSelector } from './EffectsSelector';
import { 
  GalleryThumbnails, 
  Video, 
  Newspaper, 
  User, 
  Layout, 
  Lock,
  Zap,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { defaultTheme } from '@/lib/theme-constants';
import { Button } from '@/components/ui/button';
import { motion, Reorder } from 'framer-motion';

interface LayoutEditorProps {
  form: UseFormReturn<any>;
  isVIP: boolean;
  onVipClickAction: () => void;
}

/**
 * Functional Layout Orchestrator
 * PROTOCOL: Absolute Narrative Horizon (ANH). No string reduction logic used.
 * STABILITY: Uses framer-motion Reorder for physical block manipulation.
 */

function SlotPlaceholder({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 flex-1 min-w-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">{label}</p>
      <div className="min-h-[160px] w-full p-2 border-2 border-dashed border-white/5 bg-black/20 rounded-[1.5rem] flex flex-col items-center justify-center gap-2">
        {children}
      </div>
    </div>
  );
}

function DraggableBlock({
  id,
  icon: Icon,
  label,
  description,
  vipOnly,
}: {
  id: string;
  icon: React.ElementType;
  label: string;
  description?: string;
  vipOnly?: boolean;
}) {
  return (
    <Reorder.Item
      value={id}
      id={id}
      className="w-full"
    >
      <motion.div 
        whileDrag={{ scale: 1.05, boxShadow: "0 0 40px rgba(255,0,132,0.3)" }}
        className="p-4 w-full rounded-2xl border border-white/10 bg-zinc-950 flex items-center justify-between shadow-2xl group/item cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all select-none"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Icon size={20} />
          </div>
          <div className="text-left">
              <span className="text-xs font-black text-white uppercase tracking-widest block leading-tight">{label}</span>
              {vipOnly ? (
                <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mt-0.5 block">Premium Slot</span>
              ) : (
                <span className="text-[9px] font-medium text-white/30 block mt-0.5">{description}</span>
              )}
          </div>
        </div>
        <div className="text-white/10 group-hover/item:text-primary transition-colors">
           <GripVertical size={18} />
        </div>
      </motion.div>
    </Reorder.Item>
  );
}

export function LayoutEditor({ form, isVIP, onVipClickAction }: LayoutEditorProps) {
  const { watch, setValue } = form;

  const layoutOrder = watch('theme.layoutOrder') || defaultTheme.layoutOrder;

  const handleOrderChange = (newOrder: string[]) => {
    setValue('theme.layoutOrder', newOrder, { shouldDirty: true });
  };

  const getBlockInfo = (id: string) => {
    switch (id) {
      case 'identity':
        return { icon: User, label: 'Identity', desc: 'Avatar & Stats' };
      case 'timeline':
        return { icon: Newspaper, label: 'Feed', desc: 'Activity Wall' };
      case 'media':
        return { icon: GalleryThumbnails, label: 'Archives', desc: 'Photos & Videos' };
      default:
        return { icon: Layout, label: 'Unknown', desc: '' };
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-1">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold font-headline flex items-center gap-3">
              <Layout className="h-6 w-6 text-primary" /> 
              <span className="title-pulse-glow">Layout Orchestrator</span>
            </h2>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-9 mt-1">Design your perspective</p>
          </div>
          {isVIP && (
              <div className="bg-primary/10 border border-primary/20 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,0,132,0.2)]">
                  <Zap size={10} className="text-primary fill-primary" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Live Sync</span>
              </div>
          )}
      </div>

      <div className="relative">
        <div className={cn(
          'p-6 border border-dashed border-primary/30 rounded-[3rem] space-y-10 bg-white/5 backdrop-blur-sm transition-all duration-700',
          !isVIP && 'opacity-40 grayscale pointer-events-none'
        )}>
          
          {/* DRAG-TO-REORDER GRID */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <Reorder.Group 
              axis="x" 
              values={layoutOrder} 
              onReorder={handleOrderChange}
              className="flex flex-col md:flex-row gap-4 w-full"
            >
              {layoutOrder.map((id: string, idx: number) => {
                const info = getBlockInfo(id);
                return (
                  <SlotPlaceholder key={id} label={`Slot ${idx + 1}`}>
                    <DraggableBlock 
                      id={id}
                      icon={info.icon} 
                      label={info.label} 
                      description={info.desc}
                    />
                  </SlotPlaceholder>
                );
              })}
            </Reorder.Group>
          </div>

          {/* DYNAMIC ENVIRONMENTAL EFFECTS */}
          <div className="pt-8 border-t border-white/5">
            <div className="flex items-center gap-2 mb-6 px-1">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-white/40">
                  Atmospheric Engine
                </h3>
            </div>

            <FormField
              control={form.control}
              name="theme.animatedEffects"
              render={({ field }) => (
                <FormControl>
                  <EffectsSelector
                    isVIP={isVIP}
                    value={field.value || []}
                    onChangeAction={field.onChange}
                    onVipClickAction={onVipClickAction}
                  />
                </FormControl>
              )}
            />
          </div>
        </div>

        {/* LOCKED OVERLAY */}
        {!isVIP && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
            <div className="h-16 w-16 rounded-[2rem] bg-zinc-950 border border-white/10 flex items-center justify-center mb-4 shadow-2xl">
               <Lock className="h-8 w-8 text-white/20" />
            </div>
            <h3 className="text-xl font-bold font-headline mb-2 uppercase tracking-tight">Access Locked</h3>
            <p className="text-[11px] text-white/40 max-w-[240px] mb-8 font-medium leading-relaxed uppercase tracking-widest">Upgrade to VIP to orchestrate your layout and environmental effects.</p>
            <Button onClick={onVipClickAction} className="animated-border-button h-12 px-10 rounded-full font-black uppercase text-[10px] tracking-[0.2em]">
                Join VIP Observatory
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
