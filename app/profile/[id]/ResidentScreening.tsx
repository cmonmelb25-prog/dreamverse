
'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Film, Key, Loader, Clapperboard, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { useUser } from '@/firebase/auth/use-user';
import { doc, updateDoc } from '@/firebase/client';
import Link from 'next/link';

/**
 * Resident Cinema Access Card.
 * UPDATED: Directs users to the new Cinema page instead of embedding videos.
 */
export default function ResidentScreening({ girlId }: { girlId: string }) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [unlockCode, setUnlockCode] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  const relRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'relationships', girlId);
  }, [user?.uid, firestore, girlId]);

  const { data: relationship, isLoading: isRelLoading } = useDoc<any>(
    relRef,
    user?.uid ? `users/${user.uid}/relationships/${girlId}` : null
  );

  const girlRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'aiGirls', girlId);
  }, [firestore, girlId]);

  const { data: girl, isLoading: isGirlLoading } = useDoc<any>(
    girlRef,
    girlId ? `aiGirls/${girlId}` : null
  );

  if (isRelLoading || isGirlLoading) {
    return (
      <Card className="mt-6 bg-card/60 backdrop-blur-sm border-accent/20">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader className="h-4 w-4 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const isUnlocked = relationship?.hasUnlockedMovieDate ?? false;

  const handleUnlock = async () => {
    if (!user || !firestore) return;
    
    const code = unlockCode.trim().toUpperCase();
    const VALID_CODES = ['DREAM2024', 'CINEMA', 'VICTORIA', 'SECRET', 'ACCESS'];

    if (!VALID_CODES.includes(code)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Code',
        description: "That code didn't seem to work. Ask her for the correct one!",
      });
      return;
    }

    setIsUnlocking(true);
    try {
      const docRef = doc(firestore, 'users', user.uid, 'relationships', girlId);
      await updateDoc(docRef, { hasUnlockedMovieDate: true });
      toast({
        title: 'Access Granted!',
        description: 'The Cinema is now open for you and ' + (girl?.name || 'this Resident') + '.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Unlock Failed',
        description: 'There was an error updating your status.',
      });
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <Card className="mt-6 bg-card/60 backdrop-blur-sm border-accent/20 overflow-hidden shadow-2xl">
      <CardHeader className="bg-gradient-to-r from-accent/10 to-transparent border-b border-white/5 p-6">
        <CardTitle className="font-headline text-accent flex items-center gap-2 text-2xl">
          <Clapperboard className="h-6 w-6" /> Cinema Access
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-8">
        {isUnlocked ? (
          <div className="space-y-6 text-center">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20 shadow-[0_0_20px_rgba(255,0,132,0.3)]">
              <Sparkles className="text-primary h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-bold text-white mb-2">Screening Room Open</p>
              <p className="text-sm text-white/60 max-w-xs mx-auto mb-6">
                You've unlocked the ability to watch films with {girl?.name}. 
              </p>
            </div>
            <Button asChild className="w-full h-12 rounded-2xl animated-border-button">
              <Link href="/cinema">
                <Clapperboard className="mr-2 h-5 w-5" />
                <span>Go to Cinema</span>
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center p-8 rounded-3xl bg-black/40 border-2 border-dashed border-white/10">
              <div className="relative inline-block mb-4">
                <Film className="w-12 h-12 text-muted-foreground/20" />
                <Lock className="w-6 h-6 text-primary absolute -bottom-1 -right-1" />
              </div>
              <h3 className="text-lg font-bold mb-1 text-white">Private Room Locked</h3>
              <p className="text-muted-foreground text-xs max-w-[200px] mx-auto leading-relaxed">
                Ask {girl?.name || 'Resident'} for the Cinema access code to watch together.
              </p>
            </div>

            <div className="p-6 bg-secondary/30 rounded-2xl border border-white/5">
              <label htmlFor="unlock-code-input" className="text-[9px] font-black text-muted-foreground uppercase mb-3 block tracking-widest opacity-70 px-1">
                Enter Cinema Code
              </label>
              <div className="flex gap-2">
                <Input 
                  id="unlock-code-input"
                  name="code"
                  placeholder="Code..." 
                  value={unlockCode}
                  onChange={(e) => setUnlockCode(e.target.value)}
                  className="bg-black/40 border-white/10 focus:ring-primary h-10 rounded-xl"
                />
                <Button onClick={handleUnlock} disabled={isUnlocking || !unlockCode.trim()} className="animated-border-button h-10 px-6 rounded-xl">
                  {isUnlocking ? <Loader className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
                  <span>Unlock</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
