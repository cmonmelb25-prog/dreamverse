'use server';

import { placeholderData as data } from '@/lib/placeholder-images';

type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint?: string;
};

const placeholderImages: ImagePlaceholder[] = data.placeholderImages as ImagePlaceholder[];

/**
 * Server-side placeholder resolver.
 * Ensures synchronization with the src/lib registry.
 */
export async function getServerPlaceholderImage(id?: string): Promise<string> {
  if (!id) {
    return data.placeholderImages.find(img => img.id === 'fallback')?.imageUrl || 'https://picsum.photos/seed/default/800/800';
  }

  const image = placeholderImages.find(
    (img: ImagePlaceholder) => img.id.toLowerCase() === id.toLowerCase()
  );

  return image?.imageUrl || data.placeholderImages.find(img => img.id === 'fallback')?.imageUrl || 'https://picsum.photos/seed/default/800/800';
}
