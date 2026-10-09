import type { Nullable } from './util-types';
import { z } from 'zod';
import {
  RelationshipSchema,
  InteractionSummarySchema,
  AIGirlSchema,
} from './schemas';

/**
 * Shared track interface for the music engine.
 */
export type Track = {
  id: string;
  title: string;
  artist: string;
  url: string;
  cover?: string | null;
};

/**
 * Shared message interface for both AI and user chats.
 */
export type Message = {
  callMode: string;
  callerId: string;
  status: 'ringing' | 'accepted' | 'ended' | 'missed' | 'rejected' | 'no answer' | string;
  recipientId: string;
  id: string;
  text: string;
  sender: 'user' | 'girl' | 'system' | string;
  timestamp: any; 
  createdAt: number;
  mediaUrl?: string | null;
  mediaPath?: string | null;
  type?: 'text' | 'image' | 'video' | 'audio' | 'system';
  mood?: string;
  delayMs?: number;
  clientMessageId?: string | null;
  aiReplyId?: string | null;
  reactions?: Record<string, ReactionActor[]>;
  expiresAt?: number | null; // For disappearing messages
  isEncrypted?: boolean;
  isEphemeral?: boolean;
};

export type LinkPreview = {
  url: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  siteName?: string | null;
};

/**
 * Relationship types inferred from schema.
 */
export type Relationship = z.infer<typeof RelationshipSchema>;
export type RelationshipMemory = Relationship; 

/**
 * Marketplace Item
 */
export type MarketplaceItem = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  imageUrl: string;
  sellerId: string;
  sellerName: string;
  createdAt: any;
  updatedAt?: any;
};

/**
 * Static Configuration for a Resident.
 */
export type StaticGirlConfig = {
  id: string;
  name: string;
  displayName: string;
  username: string;
  age: number;
  voiceId: string;
  location: string;
  occupation: string;
  nationality: string;
  bio: string;
  style: string[];
  hobbies: string[];
  interests: string[];
  media: {
    browseImageUrl: string;
    profileImageUrl: string;
    coverPhotoUrl: string;
    imageGallery: string[];
    exclusiveGallery: string[]; 
    introVideoUrl?: string | null;
    videoCallUrl?: string | null;
  };
  moods: Record<
    string,
    {
      messageStyle: string;
      posting: string;
      reacts: string;
      chat: string;
    }
  >;
  examples: {
    post: string;
    commentReply: string;
    chat: string;
  };
  legacyPersonalityDetails?: any;
  role: 'aigirl';
  createdAt: number;
  updatedAt: number;
  promotionTier: 'non-vip' | 'vip';
  theme?: any;
  playlist?: Track[];
};

/**
 * Runtime AIGirl Type.
 * UPDATED: Dynamic state merged with personalized static theme.
 */
export type AIGirl = z.infer<typeof AIGirlSchema> & {
  relationship: RelationshipMemory;
  playlist?: Track[];
};

/**
 * User model
 */
export type User = {
  coverUrl?: string | null;
  uid: string;
  username: string;
  displayName: Nullable<string>;
  email: Nullable<string>;
  photoURL: Nullable<string>;
  profileImagePath?: string | null;
  isVip?: boolean;
  isAdmin?: boolean;
  vipTier: 'non-vip' | 'vip'; 
  coins: number; 
  
  stripeCustomerId?: string | null;
  subscriptionActive?: boolean;
  subscriptionId?: string | null;

  bio?: Nullable<string>;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  location?: Nullable<string>;
  nationality?: string;
  interests?: string[];
  status?: 'online' | 'offline';
  lastSeen?: any;
  activeChatId?: string | null;
  galleryImages?: string[];
  galleryVideos?: string[];
  theme?: any;
  themePreset?: string;
  currentMood?: string;
  relationshipStatus?: string;
  relationshipTargetId?: string | null;
  partnerIds?: string[];
  playlist?: Track[];
};

export type LiveStream = {
  heartCount: number;
  timestamp: any;
  id: string;
  userId: string;
  ownerId: string;
  username: string;
  displayName: string;
  photoURL: string;
  title: string;
  status: 'active' | 'ended';
  startedAt: any;
  viewerCount: number;
  videoUrl?: string; 
  isAI?: boolean;
  currentMood?: string;
  sessionId?: string; 
};

/**
 * Basic identity snapshot for efficient storage.
 */
export type AuthorSnapshot = {
  id: string;
  name: string;
  nationality: string;
  profileImageUrl: string;
  profileImagePath?: string | null;
  role: 'user' | 'aigirl';
  currentMood?: string;
  isAdmin?: boolean;
  vipTier?: 'non-vip' | 'vip' | string;
  promotionTier?: 'non-vip' | 'vip' | string;
};

export type ReactionActor = {
  actorId: string;
  actorType: 'user' | 'girl';
  id: string;
  name: string;
  profileImageUrl: Nullable<string>;
  author: AuthorSnapshot;
  realUserId?: string | null;
};

export type Comment = {
  id: string;
  postId?: string;
  reelId?: string;
  actorId: string;
  actorType: 'user' | 'girl';
  realUserId?: string | null;
  author: AuthorSnapshot;
  name?: string;
  profileImageUrl?: string;
  text: string;
  timestamp?: any;
  reactions: Record<string, ReactionActor[]>;
  parentId?: string | null;
  replies?: Comment[];
};

export type FeedPost = {
  [x: string]: any;
  id: string;
  actorId: string;
  actorType: 'user' | 'girl';
  realUserId?: string | null;
  author: AuthorSnapshot;
  content: string;
  mediaUrl: Nullable<string>;
  mediaPath?: Nullable<Nullable<string>>;
  timestamp: any;
  reactions: Record<string, ReactionActor[]>;
  comments: Comment[];
  isPinned?: boolean;
  isRepost?: boolean;
  originalPostId?: string;
  targetUserId?: string | null;
  originalAuthor?: AuthorSnapshot | null;
  voiceId?: string | null;
  linkPreview?: LinkPreview | null;
};

export type Reel = {
  id: string;
  actorId: string;
  actorType: 'user' | 'girl';
  realUserId?: string | null;
  author: AuthorSnapshot;
  videoUrl: string;
  videoPath?: string | null;
  caption: string;
  timestamp: any;
  likes: ReactionActor[];
  commentCount: number;
};

export type InteractionSummary = z.infer<typeof InteractionSummarySchema>;

export type InteractionType =
  | 'chat'
  | 'voice_call'
  | 'video_call'
  | 'feed_react'
  | 'feed_comment'
  | 'reel_like'
  | 'reel_comment';

export type ShortMovie = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
};

export type CallLog = {
  id: string;
  otherId: string;
  type: 'voice' | 'video';
  status: 'missed' | 'rejected' | 'ended' | 'no answer';
  duration: number;
  timestamp: any;
};

export type NotificationType =
  | 'chat_message'
  | 'messenger_message'
  | 'feed_reaction'
  | 'feed_comment'
  | 'reel_like'
  | 'reel_comment'
  | 'match'
  | 'system';

export type Notification = {
  id: string;
  senderId: string;
  senderType: 'girl' | 'user';
  receiverId: string;
  receiverType: 'user';
  type: NotificationType;
  message: string;
  actor: {
    id: string;
    name: string;
    profileImageUrl: string;
  };
  read: boolean;
  timestamp: any;
  createdAt: any;
  updatedAt: any;
  postId?: string;
  reelId?: string;
  relatedChatId?: string;
  postContent?: string;
};

export type BatType = 'fruit' | 'big';
export type BirdType = 'gull' | 'crow' | 'magpie' | 'pigeon';

export type ActivityPost = {
  id: string;
  author: {
    name: string;
    avatarUrl: string;
  };
  content: string;
  timestamp: any;
};

export type SerializableFeedPost = FeedPost;
export type NewGirlConfig = StaticGirlConfig;

export type Engagement = {
  id: string;
  actorType: 'user' | 'girl';
  actorId: string;
  realUserId?: string;
  targetType: 'user' | 'girl';
  targetId: string;
  type: 'chat' | 'call' | 'reaction' | 'comment' | string;
  weight: number;
  timestamp: any;
};
