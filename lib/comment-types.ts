export type Comment = {
  id: string;

  // Feed uses postId, reels use reelId — both optional
  postId?: string;
  reelId?: string;

  // Identity model
  actorId: string;
  actorType: "user" | "girl";
  realUserId?: string;

  // Author snapshot (aligned with your emotional engine)
  author: {
    id: string;
    name: string;
    profileImageUrl: string;       // never null
    promotionTier: string;
    currentMood: string;           // never null
    role: "user" | "aigirl";
  };

  text: string;

  reactions: Record<
    string,
    {
      actorId: string;
      name: string;
      profileImageUrl: string;     // never null
    }[]
  >;

  timestamp: any;
  parentId: string | null;
};