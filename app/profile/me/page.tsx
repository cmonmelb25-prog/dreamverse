
import { getAuthenticatedUserId } from '@/server/actions/swipe-actions';
import { db } from '@/lib/firebase-admin';
import { redirect } from 'next/navigation';
import type { User } from '@/lib/types';
import { serializeFirestore, isValidMediaUrl, nuclearSerialize } from '@/lib/utils';
import type { ProfileTheme } from '@/lib/themeTypes';
import { defaultTheme } from '@/lib/theme-constants';
import { ProfilePageView } from '@/components/profile/ProfilePageView';
import { getUserActivity, getUserWall } from '@/server/actions/get-user-content';
import { getFollowCounts } from '@/server/actions/user-follows';

/* -------------------------------------------------------------------------- */
/*                               FETCH USER DOC                                */
/* -------------------------------------------------------------------------- */

async function getMyProfile(userId: string): Promise<User | null> {
  if (!db) return null;

  const snap = await db.collection('users').doc(userId).get();
  if (!snap.exists) return null;

  return serializeFirestore({ uid: userId, ...snap.data() }) as User;
}

/* -------------------------------------------------------------------------- */
/*                               PAGE COMPONENT                                */
/* -------------------------------------------------------------------------- */

export default async function MyProfilePage() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    redirect('/auth/signin');
  }

  const profileRaw = await getMyProfile(userId);

  if (!profileRaw) {
    redirect('/auth/signup');
  }
  
  const profile = nuclearSerialize(profileRaw);

  /* ------------------------------------------------------------------------ */
  /*                           FETCH USER CONTENT                              */
  /* ------------------------------------------------------------------------ */

  const [activityRaw, wallRaw, counts] = await Promise.all([
    getUserActivity(userId),
    getUserWall(userId),
    getFollowCounts(userId),
  ]);

  const activity = activityRaw || [];
  const wallPosts = wallRaw || [];

  /* ------------------------------------------------------------------------ */
  /*                             SAFE THEME OBJECT                             */
  /* ------------------------------------------------------------------------ */

  const theme: ProfileTheme = (profile as any).theme && typeof (profile as any).theme === 'object'
    ? (profile as any).theme
    : defaultTheme;

  /* ------------------------------------------------------------------------ */
  /*                           SAFE GALLERY ARRAYS                             */
  /* ------------------------------------------------------------------------ */
  const images = Array.isArray((profile as any).galleryImages)
    ? (profile as any).galleryImages.filter((url: string) => isValidMediaUrl(url))
    : [];

  const videos = Array.isArray((profile as any).galleryVideos)
    ? (profile as any).galleryVideos.filter((url: string) => isValidMediaUrl(url))
    : [];

  /* ------------------------------------------------------------------------ */
  /*                           SAFE BASIC FIELDS                               */
  /* ------------------------------------------------------------------------ */

  const username = profile.username || 'user';
  const displayName = profile.displayName || 'User';
  const isVip = Boolean(profile.isVip);

  /* ------------------------------------------------------------------------ */
  /*                               RENDER PAGE                                 */
  /* ------------------------------------------------------------------------ */

  return (
    <ProfilePageView
      profileId={profile.uid}
      username={username}
      displayName={displayName}
      isVip={isVip}
      isAdmin={profile.isAdmin || false}
      bio={profile.bio || ''}
      theme={theme}
      images={images}
      videos={videos}
      authoredContent={activity}
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
      
    />
  );
}
