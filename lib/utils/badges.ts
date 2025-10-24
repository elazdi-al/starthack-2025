// Badge levels and their requirements
export const BADGE_LEVELS = {
  NONE: { name: "Locked", minEvents: 0, color: "#6B7280", gradientFrom: "from-gray-500", gradientTo: "to-gray-600" },
  BRONZE: { name: "Bronze", minEvents: 3, color: "#CD7F32", gradientFrom: "from-orange-600", gradientTo: "to-amber-700" },
  SILVER: { name: "Silver", minEvents: 7, color: "#C0C0C0", gradientFrom: "from-gray-300", gradientTo: "to-gray-400" },
  GOLD: { name: "Gold", minEvents: 15, color: "#FFD700", gradientFrom: "from-yellow-400", gradientTo: "to-yellow-600" },
  PLATINUM: { name: "Platinum", minEvents: 30, color: "#E5E4E2", gradientFrom: "from-cyan-300", gradientTo: "to-blue-400" },
} as const;

export type BadgeLevel = keyof typeof BADGE_LEVELS;

/**
 * Get badge level based on number of events joined in a category
 */
export function getBadgeLevel(eventsJoined: number): BadgeLevel {
  if (eventsJoined >= BADGE_LEVELS.PLATINUM.minEvents) return "PLATINUM";
  if (eventsJoined >= BADGE_LEVELS.GOLD.minEvents) return "GOLD";
  if (eventsJoined >= BADGE_LEVELS.SILVER.minEvents) return "SILVER";
  if (eventsJoined >= BADGE_LEVELS.BRONZE.minEvents) return "BRONZE";
  return "NONE";
}

/**
 * Get badge progress information
 */
export function getBadgeProgress(eventsJoined: number) {
  const currentLevel = getBadgeLevel(eventsJoined);
  const currentLevelInfo = BADGE_LEVELS[currentLevel];

  // Find next level
  const levels: BadgeLevel[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];
  const currentIndex = levels.indexOf(currentLevel);
  const nextLevel = currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;

  if (!nextLevel) {
    // Already at max level
    return {
      current: eventsJoined,
      currentLevel,
      nextLevel: null,
      nextLevelInfo: null,
      remaining: 0,
      percentage: 100,
    };
  }

  const nextLevelInfo = BADGE_LEVELS[nextLevel];
  const remaining = nextLevelInfo.minEvents - eventsJoined;
  const previousMin = currentLevelInfo.minEvents;
  const range = nextLevelInfo.minEvents - previousMin;
  const progress = eventsJoined - previousMin;
  const percentage = Math.min(100, Math.round((progress / range) * 100));

  return {
    current: eventsJoined,
    currentLevel,
    nextLevel,
    nextLevelInfo,
    remaining,
    percentage,
  };
}

/**
 * Get medal info and color for leaderboard rankings
 */
export function getMedalInfo(rank: number) {
  switch (rank) {
    case 1:
      return {
        color: "#FFD700",
        name: "Gold",
        gradientFrom: "from-yellow-400",
        gradientTo: "to-yellow-600",
        icon: "crown"
      };
    case 2:
      return {
        color: "#C0C0C0",
        name: "Silver",
        gradientFrom: "from-gray-300",
        gradientTo: "to-gray-400",
        icon: "medal"
      };
    case 3:
      return {
        color: "#CD7F32",
        name: "Bronze",
        gradientFrom: "from-orange-600",
        gradientTo: "to-amber-700",
        icon: "medal"
      };
    default:
      return {
        color: "#6B7280",
        name: null,
        gradientFrom: "from-gray-600",
        gradientTo: "to-gray-700",
        icon: "number"
      };
  }
}
