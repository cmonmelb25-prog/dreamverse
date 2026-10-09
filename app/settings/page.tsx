'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { signOut } from 'firebase/auth';
import { deactivateAccountAction } from '@/server/actions/user-actions';
import { signOutAction } from '@/server/actions/auth-actions';
import { submitReportAction } from '@/server/actions/report-actions';
import { purchaseCoinsAction } from '@/server/actions/coin-actions';
import { COIN_PACKAGES } from '@/lib/coin-constants';
import { useUserProfile } from '@/hooks/use-user-profile';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader, 
  UserX, 
  AlertTriangle, 
  Palette, 
  Type, 
  Sliders, 
  Globe, 
  Info, 
  ScrollText, 
  Mail, 
  ShieldAlert, 
  Send,
  Coins,
  Wallet,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const FONT_OPTIONS = ['Inter', 'Roboto', 'Georgia', 'Courier New', 'Comic Sans MS'];
const COLOR_OPTIONS = ['#000000', '#3F51B5', '#00BCD4', '#D97706', '#DC2626', '#FFFFFF'];

const REPORT_REASONS = [
  'Harassment or Bullying',
  'Inappropriate Content',
  'Spam or Scams',
  'Fake Account',
  'Other Concerns',
];

function getContrastColor(hex: string) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 140 ? '#000000' : '#FFFFFF';
}

/**
 * SETTINGS DASHBOARD
 * HARDENED: Uses mount-latch to prevent SSR crashes and resolves COIN_PACKAGES.map TypeError.
 */
export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();
  const { auth } = useFirebase();
  const { profile } = useUserProfile();

  const [mounted, setMounted] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [isBuyingCoins, setIsBuyingCoins] = useState<string | null>(null);

  const [reportForm, setReportForm] = useState({
    targetId: '',
    reason: '',
    description: '',
  });

  const [settings, setSettings] = useState({
    fontSize: 16,
    fontColor: '#00BCD4',
    fontFamily: 'Inter',
    volume: 50,
    language: 'English',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    const safeTextColor = getContrastColor(settings.fontColor);
    root.style.setProperty('--font-size', `${settings.fontSize}px`);
    root.style.setProperty('--font-color', safeTextColor);
    root.style.setProperty('--font-family', settings.fontFamily);
    root.style.setProperty('--accent-color', settings.fontColor);
  }, [settings, mounted]);

  const update = (key: keyof typeof settings, value: any) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    try {
      const result = await deactivateAccountAction();
      if (result.success) {
        if (auth) await signOut(auth);
        await signOutAction();
        toast({ title: 'Account Deactivated' });
        router.push('/auth/signin');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setIsDeactivating(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportForm.targetId || !reportForm.reason) {
      toast({ variant: 'destructive', title: 'Missing Info' });
      return;
    }

    setIsReporting(true);
    try {
      const result = await submitReportAction(reportForm);
      if (result.success) {
        toast({ title: 'Report Submitted' });
        setReportForm({ targetId: '', reason: '', description: '' });
        setReportOpen(false);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Submission Failed' });
    } finally {
      setIsReporting(false);
    }
  };

  const handleBuyCoins = async (pkgId: string) => {
    setIsBuyingCoins(pkgId);
    try {
      const res = await purchaseCoinsAction(pkgId);
      if (res.success) {
        toast({ title: 'Purchase Successful', description: `Added ${res.coinsAdded} coins to your wallet.` });
      }
    } finally {
      setIsBuyingCoins(null);
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 pb-24 space-y-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold font-headline bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">Personalize your DreamVerse experience.</p>
      </div>

      {/* WALLET & COINS */}
      <Card className="bg-card/40 backdrop-blur-md border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
           <Wallet size={120} />
        </div>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
               <CardTitle className="flex items-center gap-2">
                 <Wallet className="h-5 w-5 text-amber-400" /> Wallet
               </CardTitle>
               <CardDescription>Manage your virtual currency for gifts.</CardDescription>
            </div>
            <div className="bg-amber-400/10 border border-amber-400/20 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.1)]">
               <Coins className="h-5 w-5 text-amber-400 fill-amber-400" />
               <span className="text-xl font-black text-white">{profile?.coins || 0}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="grid grid-cols-2 gap-4">
              {Array.isArray(COIN_PACKAGES) && COIN_PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handleBuyCoins(pkg.id)}
                  disabled={!!isBuyingCoins}
                  className="group relative flex flex-col items-center justify-center p-4 rounded-3xl border border-white/5 bg-black/20 hover:bg-black/40 hover:border-amber-400/30 transition-all active:scale-95"
                >
                  {pkg.bonusText && (
                    <div className="absolute -top-2 -right-1 bg-amber-500 text-[8px] font-black text-white px-2 py-0.5 rounded-full shadow-lg z-10 uppercase tracking-widest">
                       {pkg.bonusText}
                    </div>
                  )}
                  <Coins className="h-8 w-8 text-amber-400 mb-2 transition-transform group-hover:scale-110" />
                  <span className="text-lg font-black text-white">{pkg.coins}</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">${pkg.priceUsd}</span>
                  {isBuyingCoins === pkg.id && (
                     <div className="absolute inset-0 bg-black/60 rounded-3xl flex items-center justify-center backdrop-blur-sm">
                        <Loader className="animate-spin text-amber-400 h-6 w-6" />
                     </div>
                  )}
                </button>
              ))}
           </div>
        </CardContent>
      </Card>

      {/* APPEARANCE */}
      <Card className="bg-card/40 backdrop-blur-md border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="theme-select">Theme Mode</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v)}>
              <SelectTrigger id="theme-select" className="bg-black/20">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Accent Color</Label>
            <div className="flex gap-3 flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  onClick={() => update('fontColor', color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                    settings.fontColor === color ? 'border-white ring-2 ring-primary' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TYPOGRAPHY */}
      <Card className="bg-card/40 backdrop-blur-md border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" /> Typography
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label htmlFor="font-size-slider">Font Size</Label>
              <span className="text-xs font-bold text-primary">{settings.fontSize}px</span>
            </div>
            <Slider
              id="font-size-slider"
              min={12}
              max={32}
              step={1}
              value={[settings.fontSize]}
              onValueChange={(v) => update('fontSize', v[0])}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="font-family-select">Font Family</Label>
            <Select value={settings.fontFamily} onValueChange={(v) => update('fontFamily', v)}>
              <SelectTrigger id="font-family-select" className="bg-black/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font} value={font}>{font}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* SAFETY & REPORTING */}
      <Card className="bg-card/40 backdrop-blur-md border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-400">
            <ShieldAlert className="h-5 w-5" /> Safety & Reporting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <button
              onClick={() => setReportOpen(true)}
              className="w-full sm:w-auto h-11 px-6 rounded-xl border border-amber-500/30 hover:bg-amber-500/10 text-amber-200 text-sm font-bold uppercase tracking-widest transition-all"
            >
              Report a Concern
            </button>
            <DialogContent className="bg-zinc-950 border-white/10 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Safety Report</DialogTitle>
              </DialogHeader>
              <form id="report-user-form" onSubmit={handleReportSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="report-target" className="text-white/70">Who are you reporting?</Label>
                  <Input 
                    id="report-target"
                    name="targetId"
                    placeholder="Username or ID..." 
                    value={reportForm.targetId} 
                    onChange={(e) => setReportForm({...reportForm, targetId: e.target.value})}
                    className="bg-black/40 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-reason" className="text-white/70">Reason for report</Label>
                  <Select name="reason" value={reportForm.reason} onValueChange={(v) => setReportForm({...reportForm, reason: v})}>
                    <SelectTrigger id="report-reason" className="bg-black/40 border-white/10 text-white">
                      <SelectValue placeholder="Select a reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_REASONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-description" className="text-white/70">Additional Details</Label>
                  <Textarea 
                    id="report-description"
                    name="description"
                    placeholder="Please describe the issue..." 
                    value={reportForm.description}
                    onChange={(e) => setReportForm({...reportForm, description: e.target.value})}
                    className="bg-black/40 border-white/10 min-h-[100px]"
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={isReporting} className="w-full animated-border-button">
                    {isReporting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    <span>Submit Report</span>
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* SYSTEM */}
      <Card className="bg-card/40 backdrop-blur-md border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" /> System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label htmlFor="system-volume-slider">System Volume</Label>
              <span className="text-xs font-bold text-primary">{settings.volume}%</span>
            </div>
            <Slider
              id="system-volume-slider"
              min={0}
              max={100}
              step={1}
              value={[settings.volume]}
              onValueChange={(v) => update('volume', v[0])}
            />
          </div>

          <div className="pt-4 flex flex-col gap-3">
             <Button variant="link" className="justify-start p-0 h-auto text-xs text-muted-foreground hover:text-primary">
                <ScrollText className="mr-2 h-3 w-3" /> View Terms & Conditions
             </Button>
             <Button variant="link" className="justify-start p-0 h-auto text-xs text-muted-foreground hover:text-primary">
                <Mail className="mr-2 h-3 w-3" /> Contact Support
             </Button>
          </div>
        </CardContent>
      </Card>

      {/* DANGER ZONE */}
      <Card className="bg-destructive/5 backdrop-blur-md border-destructive/20 shadow-[0_0_20px_rgba(220,38,38,0.1)]">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Danger Zone
          </CardTitle>
          <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <button
              className="w-full sm:w-auto h-11 px-6 rounded-xl bg-destructive text-white text-xs font-bold uppercase tracking-widest hover:bg-destructive/90 transition-all"
            >
              Deactivate Account
            </button>
            <AlertDialogContent className="bg-black/90 backdrop-blur-2xl border-white/10 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-white/60">
                  This action will immediately disable your account and end all active sessions. 
                  You will no longer be able to log in or access your conversations.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeactivate} 
                  disabled={isDeactivating}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {isDeactivating ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
                  Deactivate Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
