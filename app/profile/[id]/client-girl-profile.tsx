'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutGrid, Loader } from 'lucide-react';
import { useFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { useUser } from '@/firebase/auth/use-user';
import { doc } from '@/firebase/client';
import { VipGallery } from '@/components/profile/VipGallery';

/**
 * @fileOverview Manages the Exclusive Gallery section for Resident profiles.
 * REMOVED: Cinema / Private Screening logic to resolve build errors.
 */

export default function ClientGirlProfile({ girlId }: { girlId: string }) {
  const { user } = useUser();
  const { firestore } = useFirebase();

  // 1. RESIDENT DOC (Public Path)
  const girlRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'aiGirls', girlId);
  }, [firestore, girlId]);

  const { data: girl, isLoading: isGirlLoading } = useDoc<any>(
    girlRef,
    girlId ? `aiGirls/${girlId}` : null
  );

  // LOADING STATE
  if (isGirlLoading) {
    return (
      <Card className="mt-6 bg-card/60 backdrop-blur-sm border-accent/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader className="h-4 w-4 animate-spin" />
            <span>Syncing archives...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const exclusiveGallery = girl?.media?.exclusiveGallery || [];

  // Don't show the card if there is no exclusive content
  if (exclusiveGallery.length === 0) return null;

  return (
    <Card className="mt-6 bg-card/60 backdrop-blur-sm border-accent/20 overflow-hidden shadow-2xl">
      <CardHeader className="bg-gradient-to-r from-accent/10 to-transparent border-b border-white/5">
        <CardTitle className="font-headline text-accent flex items-center gap-2 text-2xl">
          <LayoutGrid className="h-6 w-6" /> Exclusive Archives
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* EXCLUSIVE CONTENT GALLERY */}
          <div className="space-y-4">
            <VipGallery images={exclusiveGallery} isVIP={true} />
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 text-center border-t border-white/5 pt-4">
            Protected Multi-Modal Data
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
