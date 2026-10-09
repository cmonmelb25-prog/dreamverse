import CallsClient from '@/components/calls/CallsClient';
import { getAuthenticatedUserId } from '@/server/actions/swipe-actions';
import { redirect } from 'next/navigation';
import { Phone, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CallsPage() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-full bg-background animate-in fade-in duration-500">
      <div className="container mx-auto max-w-2xl px-4 py-8 pb-32">
        <header className="mb-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(255,0,132,0.2)]">
                <Phone className="text-primary h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-4xl font-bold font-headline bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent leading-none">
                Calls
              </h1>
              <div className="flex items-center gap-1.5 opacity-40 mt-1">
                 <ShieldCheck size={10} className="text-[#2C6BED]" />
                 <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#2C6BED]">Transmission Archives</span>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10">
           <CallsClient />
        </main>
      </div>
    </div>
  );
}
