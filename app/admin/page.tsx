'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { collection, query, where, limit, getDocs, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { 
  createRandomPost, 
  seedGirlsDatabase, 
  seedMoodsDatabase, 
  clearAllPosts,
  manualSetRelationship,
  grantAdmin,
  grantVip,
  banUser,
  addInteractionsToRandomPost
} from '@/app/admin/actions/admin-server-actions';
import { updateGirlStatus } from '@/server/actions/ai';
import { runGlobalCleanup } from '@/server/actions/cleanup-jobs';

import { AdminBackground } from '@/components/admin-background';
import { BackButton } from '@/components/back-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';
import { 
  Trash2, 
  Sparkles, 
  UserCheck, 
  Database, 
  Heart, 
  Users, 
  Ban, 
  Gem, 
  ShieldCheck,
  Zap,
  Radio,
  ExternalLink
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminPage() {
  const { user, isLoading, isAdmin } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [targetUid, setTargetUid] = useState('');
  const [isProcessingVip, setIsProcessingVip] = useState(false);
  
  const [relUserId, setRelUserId] = useState('');
  const [relGirlId, setRelGirlId] = useState('');
  const [relXp, setRelXp] = useState('0');
  const [relIsOfficial, setRelIsOfficial] = useState(false);
  const [isProcessingRel, setIsProcessingRel] = useState(false);

  const [isSeeding, setIsSeeding] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  // 1. RESIDENTS QUERY
  const girlsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'aiGirls');
  }, [firestore, user]);

  const { data: girlsData, isLoading: isGirlsLoading } = useCollection<any>(
  girlsQuery,
  'aiGirls'
);


  // 2. USERS QUERY
  const usersListQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'), limit(50));
  }, [firestore, user]);

 const { data: usersData, isLoading: isUsersLoading } = useCollection<any>(
  usersListQuery,
  'users'
);


  const girls = girlsData || [];
  const allUsers = usersData || [];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to view this page.',
      });
      router.push('/feed');
    }
  }, [mounted, isLoading, isAdmin, router, toast]);

  const handleGrantAdmin = async () => {
    if (!targetUid) return;
    setIsProcessingVip(true);
    const res = await grantAdmin(targetUid) as any;
    if (res.success) toast({ title: 'Admin Granted' });
    else toast({ variant: 'destructive', title: 'Error', description: res.error || 'Unknown error' });
    setIsProcessingVip(false);
  };

  const handleGrantVip = async (tier: 'vip' | 'non-vip') => {
    if (!targetUid) return;
    setIsProcessingVip(true);
    const res = await grantVip(targetUid, tier) as any;
    if (res.success) toast({ title: `User set to ${tier}` });
    else toast({ variant: 'destructive', title: 'Error', description: res.error || 'Unknown error' });
    setIsProcessingVip(false);
  };

  const handleBanUser = async () => {
    if (!targetUid) return;
    setIsProcessingVip(true);
    const banRes = await banUser(targetUid) as any;
    if (banRes.success) toast({ title: 'User Banned' });
    else toast({ variant: 'destructive', title: 'Error', description: banRes.error || 'Unknown error' });
    setIsProcessingVip(false);
  };

  const handleSetRel = async () => {
    if (!relUserId || !relGirlId) return;
    setIsProcessingRel(true);
    const res = await manualSetRelationship({
      userId: relUserId,
      girlId: relGirlId,
      xp: parseInt(relXp),
      isOfficial: relIsOfficial
    }) as any;
    if (res.success) toast({ title: 'Relationship Updated', description: res.message });
    else toast({ variant: 'destructive', title: 'Error', description: res.error || 'Unknown error' });
    setIsProcessingRel(false);
  };

  const handleSeedResidents = async () => {
    setIsSeeding(true);
    const res = await seedGirlsDatabase() as any;
    if (res.success) toast({ title: 'Residents Seeded', description: res.message });
    setIsSeeding(false);
  };

  const handleSeedMoods = async () => {
    setIsSeeding(true);
    const res = await seedMoodsDatabase() as any;
    if (res.success) toast({ title: 'Moods Seeded', description: res.message });
    setIsSeeding(false);
  };

  const handleCreatePost = async () => {
    setIsCreatingPost(true);
    const res = await createRandomPost() as any;
    if (res.success) toast({ title: 'Post Created', description: res.message });
    setIsCreatingPost(false);
  };

  const handleAddInteractions = async () => {
    setIsCreatingPost(true);
    const res = await addInteractionsToRandomPost() as any;
    if (res.success) toast({ title: 'Interactions Added', description: res.message });
    setIsCreatingPost(false);
  };

  const handleToggleStatus = async (girlId: string, currentStatus: string) => {
    setStatusLoadingId(girlId);
    const newStatus = currentStatus === 'online' ? 'offline' : 'online';
    try {
      const result = await updateGirlStatus(girlId, newStatus) as any;
      if (result.success) {
        toast({ title: 'Status Updated', description: `${girlId} is now ${newStatus}.` });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handlePurgeStreams = async () => {
    if (!firestore) return;
    setIsCleaning(true);
    try {
      const snap = await getDocs(collection(firestore, 'live'));
      const promises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(promises);
      toast({ title: 'Streams Purged', description: `Successfully cleared ${snap.size} stream documents.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Purge Failed', description: e.message });
    } finally {
      setIsCleaning(false);
    }
  };

  if (!mounted || isLoading || !isAdmin) {
    return <div className="h-screen flex items-center justify-center bg-black"><Loader /></div>;
  }

  return (
    <div className="relative pb-24">
      <AdminBackground />
      <div className="relative z-10 container mx-auto max-w-5xl py-12 px-4">
        <BackButton className="mb-4 -ml-4" />
        <h2 className="font-headline text-4xl font-bold title-pulse-glow mb-8">Observatory Command</h2>
        
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-black/40 border border-white/5 p-1 h-12 w-full justify-start overflow-x-auto no-scrollbar rounded-xl">
            <TabsTrigger value="users" className="gap-2 font-bold uppercase text-[10px] tracking-widest"><Users size={14} /> Users</TabsTrigger>
            <TabsTrigger value="residents" className="gap-2 font-bold uppercase text-[10px] tracking-widest"><Sparkles size={14} /> Residents</TabsTrigger>
            <TabsTrigger value="content" className="gap-2 font-bold uppercase text-[10px] tracking-widest"><Zap size={14} /> Content</TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2 font-bold uppercase text-[10px] tracking-widest"><Database size={14} /> System</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-card/80 backdrop-blur-md border-white/5">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2"><ShieldCheck size={18} /> Permission Overrides</CardTitle>
                  <CardDescription>Grant Admin or VIP tiers by User ID.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input 
                    id="admin-target-uid"
                    name="targetUid"
                    placeholder="Target User UID..." 
                    value={targetUid ?? ''} 
                    onChange={e => setTargetUid(e.target.value)} 
                    className="bg-black/20" 
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={handleGrantAdmin} disabled={isProcessingVip} className="gap-2"><ShieldCheck size={14} /> Grant Admin</Button>
                    <Button variant="outline" onClick={() => handleGrantVip('vip')} disabled={isProcessingVip} className="gap-2 text-amber-400 border-amber-500/30"><Gem size={14} /> Grant VIP</Button>
                    <Button variant="ghost" onClick={() => handleGrantVip('non-vip')} disabled={isProcessingVip} className="text-white/40">Revoke VIP</Button>
                    <Button variant="destructive" onClick={handleBanUser} disabled={isProcessingVip} className="gap-2"><Ban size={14} /> Ban User</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/80 backdrop-blur-md border-white/5">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2"><Heart size={18} /> Relationship Editor</CardTitle>
                  <CardDescription>Manually set XP or partnership status.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input 
                    id="rel-user-uid"
                    name="relUserId"
                    placeholder="User UID..." 
                    value={relUserId ?? ''} 
                    onChange={e => setRelUserId(e.target.value)} 
                    className="bg-black/20" 
                  />
               <Input
  id="rel-girl-id"
  name="relGirlId"
  placeholder="girl.id (e.g. Victoria)..."
  value={relGirlId ?? ''}
  onChange={e => setRelGirlId(e.target.value)}
  className="bg-black/20"
/>
                  <div className="flex gap-2">
                    <Input 
                      id="rel-xp-input"
                      name="relXp"
                      type="number" 
                      placeholder="XP..." 
                      value={relXp ?? '0'} 
                      onChange={e => setRelXp(e.target.value)} 
                      className="bg-black/20 w-24" 
                    />
                    <Button variant={relIsOfficial ? 'default' : 'outline'} onClick={() => setRelIsOfficial(!relIsOfficial)} className="flex-1">
                      {relIsOfficial ? 'Official Partner' : 'Not Official'}
                    </Button>
                  </div>
                  <Button onClick={handleSetRel} disabled={isProcessingRel} className="w-full animated-border-button">Apply Relationship Override</Button>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card/80 backdrop-blur-md border-white/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users size={20} className="text-primary" /> Community Member Registry</CardTitle>
                    <CardDescription>Monitor active users and manage their accounts.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {isUsersLoading ? <div className="col-span-full flex justify-center py-8"><Loader /></div> : allUsers.map((u) => (
                        <div key={u.uid} className="flex items-center justify-between p-3 rounded-xl border bg-black/40 group hover:border-primary/40 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="relative">
                                    <Avatar className="h-10 w-10 border border-white/10">
                                        <AvatarImage src={u.photoURL} className="object-cover" />
                                        <AvatarFallback>{(u.displayName || u.username || '?')[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className={cn(
                                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background shadow-sm",
                                        u.status === 'online' ? "bg-green-500" : "bg-zinc-600"
                                    )} />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-xs text-white truncate">{u.displayName || 'Member'}</p>
                                    <p className="text-[9px] font-medium text-white/30 truncate">@{u.username || u.uid.substring(0, 8)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-full text-primary hover:bg-primary/10"
                                  title="Select for override"
                                  onClick={() => {
                                      setTargetUid(u.uid);
                                      setRelUserId(u.uid);
                                      toast({ title: 'User Selected', description: `UID copied to override fields.` });
                                  }}
                                >
                                    <ExternalLink size={14} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="residents">
            <Card className="bg-card/80 backdrop-blur-md border-white/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserCheck size={20} className="text-primary" /> Live Resident Control</CardTitle>
                    <CardDescription>Manually toggle online availability of AI characters.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {isGirlsLoading ? <div className="col-span-full flex justify-center py-8"><Loader /></div> : girls.map((girl) => (
                        <div key={girl.id} className="flex items-center justify-between p-3 rounded-xl border bg-black/40">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={girl.media?.profileImageUrl} className="object-top object-cover" />
                                    <AvatarFallback>{girl.id[0]}</AvatarFallback>
                                </Avatar>
                                <span className="font-bold text-xs">{girl.name}</span>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                disabled={statusLoadingId === girl.id}
                                onClick={() => handleToggleStatus(girl.id, girl.onlineStatus)}
                                className={cn(
                                    "rounded-full px-3 h-7 text-[9px] font-black uppercase tracking-widest transition-all",
                                    girl.onlineStatus === 'online' 
                                        ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                                )}
                            >
                                {statusLoadingId === girl.id ? <Loader className="h-3 w-3" /> : (girl.onlineStatus || 'offline')}
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-card/80 backdrop-blur-md border-white/5">
                    <CardHeader>
                        <CardTitle className="text-primary flex items-center gap-2"><Database size={18} /> Database Seeding</CardTitle>
                        <CardDescription>Reset or update core application data.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <Button variant="outline" onClick={handleSeedResidents} disabled={isSeeding}>Sync Residents Registry</Button>
                            <Button variant="outline" onClick={handleSeedMoods} disabled={isSeeding}>Seed Mood Database</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-md border-white/5">
                    <CardHeader>
                        <CardTitle className="text-primary flex items-center gap-2"><Zap size={18} /> Content Triggers</CardTitle>
                        <CardDescription>Manually trigger background AI behavior.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <Button onClick={handleCreatePost} disabled={isCreatingPost} className="animated-border-button">Force Random Resident Post</Button>
                            <Button onClick={handleAddInteractions} variant="outline" disabled={isCreatingPost}>Trigger Random Interactions</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
          </TabsContent>

          <TabsContent value="maintenance">
            <div className="space-y-6">
                <Card className="bg-card/80 backdrop-blur-md border-white/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Database size={20} className="text-primary" /> System Maintenance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border p-4 bg-black/20">
                            <div>
                                <h3 className="font-semibold text-sm">Global System Cleanup</h3>
                                <p className="text-xs text-white/40">Purge stale notifications and logs.</p>
                            </div>
                            <Button onClick={() => { setIsCleaning(true); runGlobalCleanup().then((res: any) => { toast({ title: res.message || 'Cleanup complete' }); setIsCleaning(false); }); }} disabled={isCleaning}>
                                {isCleaning ? 'Processing...' : 'Run Cleanup'}
                            </Button>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-4 bg-black/20">
                            <div>
                                <h3 className="font-semibold text-sm">Purge Active Streams</h3>
                                <p className="text-xs text-white/40">Force clear all "Live" status indicators.</p>
                            </div>
                            <Button variant="outline" onClick={handlePurgeStreams} disabled={isCleaning} className="border-red-500/30 text-red-400">
                                <Radio className="mr-2 h-4 w-4" /> Purge Streams
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-md border-destructive/50">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2"><Trash2 size={20} /> Danger Zone</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between rounded-lg border border-destructive/20 p-4 bg-destructive/5">
                            <div>
                                <h3 className="font-semibold text-destructive text-sm">Wipe All Feed Posts</h3>
                                <p className="text-xs text-destructive/60">This cannot be undone.</p>
                            </div>
                            <Button onClick={() => clearAllPosts().then((res: any) => toast({ title: res.message || 'All posts cleared' }))} variant="destructive">Clear All Posts</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
