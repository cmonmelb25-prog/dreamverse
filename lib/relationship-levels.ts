export type RelationshipLevelName =
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close friends'
  | 'relationship';
  

export type RelationshipLevel = {
  level: number;
  name: RelationshipLevelName;
  xpThreshold: number;
};

export const relationshipLevels: RelationshipLevel[] = [
  { level: 0, name: 'stranger', xpThreshold: 0 },
  { level: 1, name: 'acquaintance', xpThreshold: 100 },
  { level: 2, name: 'friend', xpThreshold: 300 },
  { level: 3, name: 'close friends', xpThreshold: 600 },
  { level: 4, name: 'relationship', xpThreshold: 1000 },
];

type RelationshipLevelInfo = {
  level: number;
  name: RelationshipLevelName;
  xpThreshold: number;
  xpToNextLevel: number;
  progressPercentage: number;
  xpInLevel: number;
  xpForNext: number;
  isMaxLevel: boolean;
  xpProgress: number;
};

export function getRelationshipLevelInfo(xp: number, isOfficial: boolean = false): RelationshipLevelInfo {
  let currentLevelIndex = 0;

  for (let i = relationshipLevels.length - 1; i >= 0; i--) {
    if (xp >= relationshipLevels[i].xpThreshold) {
      currentLevelIndex = i;
      break;
    }
  }

  // ✅ CAP AT 'CLOSE FRIENDS' UNLESS OFFICIAL AGREEMENT EXISTS
  // This means even if XP is 1000+, it stays at Close Friends (Level 3)
  // until the user and girl agree to be official.
  if (currentLevelIndex >= 4 && !isOfficial) {
    currentLevelIndex = 3;
  }

  const currentLevel = relationshipLevels[currentLevelIndex];
  const nextLevel = relationshipLevels[currentLevelIndex + 1];
  
  // If we are capped at level 3, we act as if there is no next level for the bar
  const isMaxLevel = !nextLevel || (currentLevelIndex === 3 && !isOfficial);

  const xpForThisLevel = currentLevel.xpThreshold;
  const xpForNextLevel = nextLevel ? nextLevel.xpThreshold : xpForThisLevel;

  const xpInLevel = xp - xpForThisLevel;
  const xpToNextLevel = xpForNextLevel - xpForThisLevel;

  const progressPercentage = isMaxLevel
    ? 100
    : Math.floor((Math.min(xpInLevel, xpToNextLevel) / xpToNextLevel) * 100);

  return {
    ...currentLevel,
    xpToNextLevel: xpToNextLevel || 100, // avoid division by zero
    progressPercentage,
    xpInLevel,
    xpForNext: isMaxLevel ? 0 : xpToNextLevel - xpInLevel,
    isMaxLevel,
    xpProgress: Math.min(xpInLevel, xpToNextLevel),
  };
}

export function getRelationshipInfo(xp: number, isOfficial: boolean = false) {
  const levelInfo = getRelationshipLevelInfo(xp, isOfficial);
  return {
    level: levelInfo.level,
    levelName: levelInfo.name,
    xpToNextLevel: levelInfo.xpToNextLevel,
    progressPercentage: levelInfo.progressPercentage,
    xpInLevel: levelInfo.xpInLevel,
    isMaxLevel: levelInfo.isMaxLevel,
  };
}
