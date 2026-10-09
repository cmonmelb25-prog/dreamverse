'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { CategoryBar, CATEGORIES } from '@/components/marketplace/CategoryBar';
import { ProductCard } from '@/components/marketplace/ProductCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Plus, 
  X, 
  ShoppingBag, 
  Loader, 
  Tag, 
  MapPin, 
  ImageIcon, 
  Upload, 
  MessageSquare,
  Trash2,
  Edit2,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createMarketplaceItem, deleteMarketplaceItem, updateMarketplaceItem } from '@/server/actions/marketplace-actions';
import type { MarketplaceItem } from '@/lib/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

/**
 * MARKETPLACE CLIENT ENGINE
 * Overhauled to mirror Facebook Marketplace functionality.
 * ADDED: "Your Listings" filter and hardened Detail View.
 */
export default function MarketplaceClient({ initialItems }: { initialItems: MarketplaceItem[] }) {
  const { user, profile } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [items] = useState<MarketplaceItem[]>(initialItems);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyMyListings, setShowOnlyMyListings] = useState(false);
  
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category: 'Misc',
    location: '',
    description: '',
    imageUrl: ''
  });

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (item.location || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesOwnership = !showOnlyMyListings || item.sellerId === user?.uid;
      
      return matchesCategory && matchesSearch && matchesOwnership;
    });
  }, [items, activeCategory, searchQuery, showOnlyMyListings, user?.uid]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const idToken = await user.getIdToken();
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('userId', user.uid);
      formDataUpload.append('idToken', idToken);
      formDataUpload.append('type', 'post');

      const res = await fetch('/api/upload', { method: 'POST', body: formDataUpload });
      const result = await res.json();
      if (result.success) {
        setFormData(prev => ({ ...prev, imageUrl: result.url }));
        toast({ title: 'Photo uploaded!' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload failed' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await createMarketplaceItem({
        ...formData,
        price: Number(formData.price),
        sellerId: user.uid,
        sellerName: profile?.displayName || user.displayName || 'Seller'
      });

      if (res.success) {
        toast({ title: 'Listing published!' });
        setIsSellModalOpen(false);
        window.location.reload();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedItem || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await updateMarketplaceItem(selectedItem.id, {
        ...formData,
        price: Number(formData.price)
      });
      if (res.success) {
        toast({ title: 'Listing updated!' });
        setIsEditModalOpen(false);
        setIsDetailModalOpen(false);
        window.location.reload();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !selectedItem || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const res = await deleteMarketplaceItem(selectedItem.id, user.uid);
      if (res.success) {
        toast({ title: 'Listing removed.' });
        setIsDetailModalOpen(false);
        window.location.reload();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = () => {
    if (!selectedItem) return;
    setFormData({
      title: selectedItem.title || '',
      price: String(selectedItem.price || 0),
      category: selectedItem.category || 'Misc',
      location: selectedItem.location || '',
      description: selectedItem.description || '',
      imageUrl: selectedItem.imageUrl || ''
    });
    setIsEditModalOpen(true);
  };

  const selectItem = (item: MarketplaceItem) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const currentUserId = user?.uid;
  const isOwner = selectedItem && currentUserId === selectedItem.sellerId;

  return (
    <div className="space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 h-4 w-4 pointer-events-none" />
          <Input 
            placeholder="Search listings..."
            className="pl-11 h-12 rounded-full bg-card/40 border-white/5 shadow-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          {user && (
            <Button 
              variant={showOnlyMyListings ? "default" : "outline"}
              onClick={() => setShowOnlyMyListings(!showOnlyMyListings)}
              className={cn(
                "rounded-full h-12 px-6 font-bold uppercase tracking-widest text-[10px] transition-all",
                showOnlyMyListings ? "bg-primary border-primary shadow-[0_0_15px_rgba(255,0,132,0.4)]" : "border-white/10 hover:bg-white/5"
              )}
            >
              <UserCheck className="mr-2 h-4 w-4" />
              {showOnlyMyListings ? "Your Items" : "My Listings"}
            </Button>
          )}

          <Button 
            onClick={() => {
              if (!user) {
                 toast({ variant: 'destructive', title: 'Sign In Required', description: 'You must be logged in to sell items.' });
                 return;
              }
              setFormData({ title: '', price: '', category: 'Misc', location: '', description: '', imageUrl: '' });
              setIsSellModalOpen(true);
            }} 
            className="rounded-full h-12 px-8 animated-border-button font-black uppercase tracking-widest text-[10px]"
          >
            <Plus className="mr-2 h-4 w-4" /> Sell Something
          </Button>
        </div>
      </div>

      <CategoryBar activeCategory={activeCategory} onSelectAction={setActiveCategory} />

      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card/20 rounded-[2.5rem] border border-dashed border-white/5 text-white/20">
           <ShoppingBag size={64} className="mb-4 opacity-10" />
           <p className="font-headline text-2xl uppercase tracking-widest">No listings found</p>
           {showOnlyMyListings && <p className="text-[10px] font-black uppercase tracking-widest mt-2">You haven't posted any items yet</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredItems.map(item => (
            <ProductCard 
              key={item.id} 
              item={item} 
              isOwner={currentUserId === item.sellerId}
              onSelectAction={selectItem} 
            />
          ))}
        </div>
      )}

      {/* DETAIL MODAL - HARDENED INTEGRITY */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
           <DialogHeader className="sr-only">
             <DialogTitle>{selectedItem?.title || 'Listing Details'}</DialogTitle>
             <DialogDescription>Detailed view for marketplace listing.</DialogDescription>
           </DialogHeader>

           {selectedItem ? (
             <div className="flex flex-col md:flex-row min-h-[500px] max-h-[90vh] text-white">
                {/* Visual Side */}
                <div className="w-full md:w-1/2 aspect-square md:aspect-auto bg-zinc-900 relative">
                   {selectedItem.imageUrl ? (
                     <img src={selectedItem.imageUrl} alt={selectedItem.title} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-white/10">
                        <ImageIcon size={64} />
                        <span className="text-[10px] font-black uppercase mt-2">No Image Provided</span>
                     </div>
                   )}
                   <div className="absolute top-6 left-6 bg-black/80 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/10 shadow-2xl z-10">
                      <span className="text-lg font-black text-primary">
                        {selectedItem.price === 0 ? 'Free' : `$${selectedItem.price.toLocaleString()}`}
                      </span>
                   </div>
                </div>

                {/* Info Side - Darkened for High Contrast */}
                <div className="w-full md:w-1/2 p-8 flex flex-col overflow-y-auto no-scrollbar bg-black/60 backdrop-blur-md border-l border-white/5">
                   <div className="flex-1 space-y-6">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 inline-block">
                          {selectedItem.category || 'Misc'}
                        </span>
                        <h2 className="text-3xl font-bold text-white font-headline mt-4">{selectedItem.title || 'Untitled Listing'}</h2>
                        <div className="flex items-center gap-1.5 text-white/40 text-[10px] mt-2 font-black uppercase tracking-[0.2em]">
                          <MapPin size={12} className="text-primary" />
                          <span>{selectedItem.location || 'Unknown Location'}</span>
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 shadow-inner">
                         <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap font-medium">
                            {selectedItem.description || "The seller hasn't provided a description for this item."}
                         </p>
                      </div>

                      <Link href={`/profile/${selectedItem.sellerId}`} className="flex items-center justify-between p-4 border border-white/5 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group">
                         <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-black text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                                {selectedItem.sellerName?.[0] || 'S'}
                            </div>
                            <div>
                               <span className="text-xs font-black text-white block">{selectedItem.sellerName || 'Seller'}</span>
                               <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">View Seller Profile</span>
                            </div>
                         </div>
                         <ChevronRight size={16} className="text-white/20 group-hover:translate-x-1 transition-transform" />
                      </Link>
                   </div>

                   <div className="pt-8 mt-8 border-t border-white/5 space-y-3 shrink-0">
                      {isOwner ? (
                        <div className="grid grid-cols-2 gap-3 w-full">
                           <Button 
                             variant="outline" 
                             className="rounded-2xl h-12 border-white/10 font-bold uppercase tracking-widest text-[10px] bg-white/5 hover:bg-white/10" 
                             onClick={openEdit}
                           >
                             <Edit2 size={14} className="mr-2" /> Edit Listing
                           </Button>
                           <Button 
                             variant="destructive" 
                             className="rounded-2xl h-12 font-bold uppercase tracking-widest text-[10px]" 
                             onClick={handleDelete}
                             disabled={isSubmitting}
                           >
                             {isSubmitting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Trash2 size={14} className="mr-2" />} Remove
                           </Button>
                        </div>
                      ) : (
                        <Button 
                          className="w-full h-14 rounded-[2rem] animated-border-button font-black uppercase tracking-[0.2em]" 
                          onClick={() => {
                            if (!currentUserId) {
                               router.push('/auth/signin');
                               return;
                            }
                            const chatId = [currentUserId, selectedItem.sellerId].sort().join('_');
                            router.push(`/messages/${chatId}?new=true`);
                          }}
                        >
                           <MessageSquare size={18} className="mr-2" /> Message Seller
                        </Button>
                      )}
                   </div>
                </div>
             </div>
           ) : (
             <div className="h-[400px] flex flex-col items-center justify-center text-white/20">
                <Loader className="animate-spin h-8 w-8 mb-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest">Accessing Details...</span>
             </div>
           )}
        </DialogContent>
      </Dialog>

      {/* SELL/EDIT MODAL */}
      <Dialog open={isSellModalOpen || isEditModalOpen} onOpenChange={(open) => { if(!open) { setIsSellModalOpen(false); setIsEditModalOpen(false); }}}>
        <DialogContent className="max-w-xl bg-zinc-950 border-white/10 p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
          <form onSubmit={isEditModalOpen ? handleUpdate : handleCreate}>
            <DialogHeader className="p-8 bg-black/40 border-b border-white/5">
              <DialogTitle className="text-3xl font-bold font-headline">
                {isEditModalOpen ? 'Update Listing' : 'List Item'}
              </DialogTitle>
              <DialogDescription className="text-white/40">
                Provide the details of your offering in the DreamVerse.
              </DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Item Title</Label>
                     <Input placeholder="What are you selling?" className="bg-white/5 border-white/10 h-11 rounded-xl" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Price (USD)</Label>
                     <Input type="number" className="bg-white/5 border-white/10 h-11 rounded-xl" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Category</Label>
                     <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                        <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10">
                           {CATEGORIES.filter(c => c.name !== 'All').map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Location</Label>
                     <Input placeholder="City, State" className="bg-white/5 border-white/10 h-11 rounded-xl" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} required />
                  </div>
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Product Photo</Label>
                  <div className="flex gap-2">
                     <Input placeholder="Image URL..." className="bg-white/5 border-white/10 flex-1 h-11 rounded-xl" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} required />
                     <Button type="button" variant="secondary" className="h-11 w-11 rounded-xl" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Loader className="animate-spin h-4 w-4" /> : <Upload size={16} />}
                     </Button>
                     <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                  </div>
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Description</Label>
                  <Textarea className="bg-white/5 border-white/10 min-h-[100px] rounded-xl" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Tell us more about the item..." />
               </div>
            </div>
            <DialogFooter className="p-8 bg-black/40 border-t border-white/5">
              <Button type="submit" disabled={isSubmitting || isUploading} className="w-full animated-border-button h-12 rounded-2xl font-black uppercase tracking-widest">
                {isSubmitting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Tag size={16} className="mr-2" />}
                {isEditModalOpen ? 'Save Changes' : 'Confirm Listing'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
