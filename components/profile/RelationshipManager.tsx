'use client';

import React, { useState, useMemo } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { allGirls } from '@/lib/server/girls-data';
import { breakUpWithGirl } from '@/server/actions/user-actions';
import { useToast } from '@/hooks/use-toast';
import { PartnerName } from './PartnerName';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PartnerRowProps {
  partnerId: string;
  image: string;
  isProcessing: boolean;
  onBreakup: () => void;
}

const PartnerRow: React.FC<PartnerRowProps> = ({ partnerId, image, isProcessing, onBreakup }) => {
  return (
    <div 
      className="flex items-center justify-between p-3 rounded-xl border border-primary/20 bg-primary/5 transition-all animate-in fade-in slide-in-from-bottom-1"
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border-2 border-white/10 shadow-lg">
          <AvatarImage src={image} className="object-cover object-top" />
          <AvatarFallback>?</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-bold text-white">
            <PartnerName partnerId={partnerId} />
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary/80">
            Official Partner
          </p>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        className="text-destructive hover:bg-destructive/10 rounded-full px-4 h-9" 
        disabled={isProcessing}
        onClick={onBreakup}
      >
        {isProcessing ? <Loader className="h-4 w-4" /> : 'Break Up'}
      </Button>
    </div>
  );
};

export function RelationshipManager() {
  const { profile, isLoading } = useUser();
  const { toast } = useToast();

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [targetPartnerId, setTargetPartnerId] = useState<string | null>(null);

  const partnerIds = profile?.partnerIds || [];

  const handleBreakup = async () => {
    if (!targetPartnerId || processingId) return;
    
    const girlId = targetPartnerId;
    setProcessingId(girlId);
    setTargetPartnerId(null);

    try {
      const result = await breakUpWithGirl(girlId);
      if (result.success) {
        toast({
          title: 'Relationship Ended',
          description: 'The timeline has been updated.',
        });
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to end relationship.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const partnersData = useMemo(() => {
    return partnerIds.map(partnerId => {
      const girlMatch = allGirls.find(g => g.id.toLowerCase() === partnerId.toLowerCase());
      return {
        id: partnerId,
        image: girlMatch?.media?.profileImageUrl || ''
      };
    });
  }, [partnerIds]);

  if (isLoading) {
    return (
      <Card className="bg-black/20 border-white/5">
        <CardHeader>
          <CardTitle>Relationships</CardTitle>
          <CardDescription>Syncing parallel realities...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-black/20 border-white/5 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Relationship Management</CardTitle>
          <CardDescription>
            Your current connections in the DreamVerse.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {partnersData.length === 0 ? (
            <p className="text-muted-foreground text-sm italic py-4">
              You are not currently in any official relationships.
            </p>
          ) : (
            partnersData.map((partner) => (
              <PartnerRow
                key={partner.id}
                partnerId={partner.id}
                image={partner.image}
                isProcessing={processingId === partner.id}
                onBreakup={() => setTargetPartnerId(partner.id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <AlertDialog 
        open={targetPartnerId !== null} 
        onOpenChange={(isOpen) => { if (!isOpen) setTargetPartnerId(null); }}
      >
        <AlertDialogContent className="bg-black/90 backdrop-blur-xl border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>End Relationship?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset your official status with{' '}
              <span className="text-white font-semibold">
                {targetPartnerId ? <PartnerName partnerId={targetPartnerId} /> : 'this Resident'}
              </span>.
              Your history will remain, but you will no longer be considered "Official" in the observatory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white rounded-full">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBreakup}
              className="bg-destructive text-white hover:bg-destructive/90 rounded-full px-6"
            >
              End Relationship
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
