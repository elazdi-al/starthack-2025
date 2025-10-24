import { leaderboardAPI } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

// Query keys for better cache management
export const leaderboardKeys = {
  all: ["leaderboard"] as const,
  list: (limit?: number) => [...leaderboardKeys.all, "list", limit] as const,
  userStats: (address: string) => [...leaderboardKeys.all, "user", address] as const,
  userCategoryStats: (address: string, categories: string[]) =>
    [...leaderboardKeys.all, "user", address, "categories", categories] as const,
};

/**
 * Fetch leaderboard data
 */
export function useLeaderboard(options?: {
  enabled?: boolean;
  limit?: number;
}) {
  const { enabled = true, limit = 10 } = options || {};

  return useQuery({
    queryKey: leaderboardKeys.list(limit),
    queryFn: async () => {
      const response = await leaderboardAPI.getLeaderboard(limit);
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true, // Refresh leaderboard when user comes back
    enabled,
  });
}

/**
 * Fetch user statistics
 */
export function useUserStats(address: string | null | undefined) {
  return useQuery({
    queryKey: leaderboardKeys.userStats(address ?? ""),
    queryFn: async () => {
      if (!address) {
        throw new Error("Address is required");
      }
      const response = await leaderboardAPI.getUserStats(address);
      return response;
    },
    enabled: !!address,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch user category statistics and badge progress
 */
export function useUserCategoryStats(
  address: string | null | undefined,
  categories: string[]
) {
  return useQuery({
    queryKey: leaderboardKeys.userCategoryStats(address ?? "", categories),
    queryFn: async () => {
      if (!address) {
        throw new Error("Address is required");
      }
      const response = await leaderboardAPI.getUserCategoryStats(address, categories);
      return response;
    },
    enabled: !!address && categories.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });
}
