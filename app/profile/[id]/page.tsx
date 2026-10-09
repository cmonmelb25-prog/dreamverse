
import { getGirl } from '@/lib/server/girls';
import { nuclearSerialize, isValidMediaUrl } from '@/lib/utils';
import type { AIGirl, Reel, FeedPost, User as UserProfile } from '@/lib/types';
import { notFound } from 'next/navigation';
import { getGirlActivity, getGirlWall } from '@/server/actions/get-girl-content';
import { getUserActivity, getUserWall } from '@/server/actions/get-user-content';
import AiGirlProfileView from './AiGirlProfileView';
import { ProfilePageView } from '@/components/profile/ProfilePageView';
import { defaultTheme } from '@/lib/theme-constants';
import { normalizeAIGirl } from '@/lib/normalizeAIGirl';
import { getFollowCounts } from '@/server/actions/user-follows';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

/**
 * DYNAMIC METADATA: Ensures professional previews when sharing profiles.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getGirl(id);

  if (!result) return { title: 'Profile Not Found | DreamVerse' };

  const name = result.name || result.displayName || 'User';
  const bio = result.bio || `Check out ${name} on DreamVerse.`;

  return {
    title: `${name} (@${result.username || id}) | DreamVerse`,
    description: bio,
    openGraph: {
      title: `${name} | DreamVerse`,
      description: bio,
      images: [result.media?.profileImageUrl || result.photoURL || ''],
    },
  };
}

/**
 * Shared Profile Page Route.
 * ROUTES: Dispatches to either the Resident view or the Community view based on the 'role' field.
 */
export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const awaitedParams = await params;
  const id = awaitedParams?.id;

  if (!id) {
    notFound();
  }

  // Fetch base profile data (Works for both Residents and Users)
  const result = await getGirl(id);

  if (!result) {
    notFound();
  }

  const counts = await getFollowCounts(id);

  // 1. ROUTE TO AI RESIDENT VIEW
  if (result.role === 'aigirl') {
    const girlRaw = result as AIGirl;
    
    const [activityRaw, wallRaw] = await Promise.all([
      getGirlActivity(girlRaw.id),
      getGirlWall(girlRaw.id)
    ]);
    
    const girl = nuclearSerialize(normalizeAIGirl(girlRaw)) as AIGirl;
    const authoredContent = activityRaw || [];
    const wallPosts = wallRaw || [];
    
    return (
      <AiGirlProfileView 
        girl={girl} 
        authoredContent={authoredContent} 
        wallPosts={wallPosts}
      />
    );
  }

  // 2. ROUTE TO COMMUNITY MEMBER VIEW (MySpace Style)
  const profile = nuclearSerialize(result) as unknown as UserProfile;
  
  const [activityRaw, wallRaw] = await Promise.all([
    getUserActivity(id), 
    getUserWall(id)
  ]);

  const authoredContent = activityRaw || [];
  const wallPosts = wallRaw || [];
  
  const images = Array.isArray((result as any).galleryImages)
    ? (result as any).galleryImages.filter((url: string) => isValidMediaUrl(url))
    : [];

  const videos = Array.isArray((result as any).galleryVideos)
    ? (result as any).galleryVideos.filter((url: string) => isValidMediaUrl(url))
    : [];
  
  return (
    <ProfilePageView
      profileId={id}
      username={profile.username || 'user'}
      displayName={profile.displayName || 'User'}
      isVip={profile.isVip || false}
      isAdmin={profile.isAdmin || false}
      bio={profile.bio || ''}
      theme={(result as any).theme || defaultTheme}
      images={images}
      videos={videos}
      authoredContent={authoredContent}
      wallPosts={wallPosts}
      followersCount={counts.followers}
      followingCount={counts.following}
      relationshipStatus={profile.relationshipStatus}
      relationshipTargetId={profile.relationshipTargetId}
      partnerIds={profile.partnerIds}
      nationality={profile.nationality}
      location={profile.location || undefined}
      age={profile.age}
      avatarUrl={profile.photoURL || undefined}
      coverUrl={profile.coverUrl || undefined}
      role="user"
    />
  );
}
