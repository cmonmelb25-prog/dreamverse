import type { AIGirl } from "@/lib/types";
import { getPlaceholderImage } from "@/lib/placeholder";
import { isValidMediaUrl } from "@/lib/utils";
import { allGirls } from "./server/girls-data";
import { normalizeRelationship } from "./normalizeRelationship";
import { defaultTheme } from "./theme-constants";

/**
 * Normalizes raw persona data into a valid runtime AIGirl object.
 * HARDENED: Identity fields are strictly Registry-first. Backstories are immutable.
 * BEHAVIORAL: Mood and XP are merged from Firestore.
 * PROTOCOL: Absolute Narrative Horizon (ANH). No string reduction logic used.
 */
export function normalizeAIGirl(raw: any): AIGirl {
  const g = raw || {};
  const id = g.id || "unknown";

  // 1. RESOLVE STATIC IDENTITY (Authoritative Source)
  const staticMatch = allGirls.find(sg => sg.id.toLowerCase() === id.toLowerCase());

  // FIXED: Residents strictly use Registry for core fields to prevent "unknown" regressions
  const name = staticMatch?.name || g.name || "Unknown";
  const age = staticMatch?.age ?? g.age ?? 25;
  const location = staticMatch?.location || g.location || 'DreamVerse';
  const bio = staticMatch?.bio || g.bio || '';
  const nationality = staticMatch?.nationality || g.nationality || 'Multiversal';
  const occupation = staticMatch?.occupation || g.occupation || 'Resident';

  const profileImageUrl = g.media?.profileImageUrl || g.profileImageUrl || staticMatch?.media?.profileImageUrl || getPlaceholderImage(id);
  const coverPhotoUrl = staticMatch?.media?.coverPhotoUrl || g.media?.coverPhotoUrl || '';

  return {
    ...g,
    id: staticMatch?.id || id,
    name: name,
    displayName: staticMatch?.displayName || g.displayName || name,
    username: staticMatch?.username || g.username || name.toLowerCase(),
    
    bio: bio,
    location: location,
    nationality: nationality,
    occupation: occupation,
    age: age,
    
    style: Array.isArray(staticMatch?.style) ? staticMatch?.style : (Array.isArray(g.style) ? g.style : []),
    hobbies: Array.isArray(staticMatch?.hobbies) ? staticMatch?.hobbies : (Array.isArray(g.hobbies) ? g.hobbies : []),
    interests: Array.isArray(staticMatch?.interests) ? staticMatch?.interests : (Array.isArray(g.interests) ? g.interests : []),
    
    currentMood: g.currentMood || "Neutral",
    profileImageUrl: profileImageUrl,
    relationshipStatus: g.relationshipStatus || "single",
    relationshipTargetId: g.relationshipTargetId || null,
    
    onlineStatus: g.onlineStatus || "offline",
    xp: g.xp || 0,
    isFeatured: g.isFeatured || false,
    popularityScore: g.popularityScore || 0,
    tags: g.tags || [],
    
    role: 'aigirl',
    promotionTier: staticMatch?.promotionTier || g.promotionTier || g.vipTier || 'non-vip',
    createdAt: g.createdAt || Date.now(),
    updatedAt: g.updatedAt || Date.now(),
    moods: staticMatch?.moods || g.moods || {},
    examples: staticMatch?.examples || g.examples || { post: '', commentReply: '', chat: '' },

    // STATIC IDENTITY THEME (Locked for Residents)
    theme: staticMatch?.theme || defaultTheme,

    media: {
      profileImageUrl,
      browseImageUrl: g.media?.browseImageUrl || staticMatch?.media?.browseImageUrl || profileImageUrl,
      coverPhotoUrl: coverPhotoUrl,
      imageGallery: (g.media?.imageGallery || staticMatch?.media?.imageGallery || []).filter((url: string) => isValidMediaUrl(url)),
      exclusiveGallery: (g.media?.exclusiveGallery || staticMatch?.media?.exclusiveGallery || []).filter((url: string) => isValidMediaUrl(url)),
      introVideoUrl: g.media?.introVideoUrl || staticMatch?.media?.introVideoUrl || null,
      videoCallUrl: g.media?.videoCallUrl || staticMatch?.media?.videoCallUrl || null,
    },

    relationship: g.relationship ? normalizeRelationship(g.relationship) : {
      xp: 0,
      confidence: 50,
      interest: 50,
      relationshipStats: { xp: 0, confidence: 50, interest: 50, relationshipStatus: 'single', relationshipTargetId: '' },
      relationshipTier: 'stranger',
      interestCeiling: 'none',
      emotionalState: 'neutral',
      lastTone: 'neutral',
      toneHistory: [],
      lastInteraction: 0,
      silenceHours: 0,
      recentInteractions: [],
      isArgument: false,
      lastToneWasRudeOrDefensive: false,
      userIsReassuring: false,
      isOfficial: false,
      userProfileMemory: { importantRoles: [], customFacts: {} }
    },
  };
}
