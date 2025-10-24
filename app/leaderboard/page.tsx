"use client";

import { BackgroundGradient } from "@/components/layout/BackgroundGradient";
import { TopBar } from "@/components/layout/TopBar";
import { DesktopNav } from "@/components/layout/DesktopNav";
import { useAuthCheck } from "@/lib/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLeaderboard, useUserCategoryStats } from "@/lib/hooks/useLeaderboard";
import { useAccount } from "wagmi";
import { getMedalInfo, BADGE_LEVELS } from "@/lib/utils/badges";
import { useFarcasterProfile } from "@/lib/hooks/useFarcasterProfile";
import { Crown, Medal, Lock, Star, Trophy as TrophyIcon } from "phosphor-react";
import { useInfiniteEvents } from "@/lib/hooks/useEvents";
import { parseCategoriesString } from "@/lib/utils/eventMetadata";
import { getCategoryColor } from "@/lib/utils/categoryColors";
import Image from "next/image";

// Helper function to calculate remaining time until end of month
function useTimeUntilEndOfMonth() {
  const [timeRemaining, setTimeRemaining] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const diff = endOfMonth.getTime() - now.getTime();

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      setTimeRemaining(`${days}d ${hours}h`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return timeRemaining;
}

export default function Leaderboard() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthCheck();
  const { address } = useAccount();
  const leaderboardQuery = useLeaderboard({ limit: 10 });
  const timeRemaining = useTimeUntilEndOfMonth();

  // Fetch all events to get categories
  const allEventsQuery = useInfiniteEvents({
    enabled: isAuthenticated && hasHydrated,
    limit: 50,
    search: "",
    category: "",
  });

  // Extract unique categories from all events
  const uniqueCategories = useMemo(() => {
    const categorySet = new Set<string>();
    if (allEventsQuery.data?.pages) {
      allEventsQuery.data.pages.forEach((page) => {
        page.events.forEach((event) => {
          const categories = parseCategoriesString(event.categoriesString);
          categories.forEach((cat) => categorySet.add(cat));
        });
      });
    }
    return Array.from(categorySet).sort();
  }, [allEventsQuery.data?.pages]);

  // Fetch user's category stats - only when we have categories
  const userCategoryStatsQuery = useUserCategoryStats(
    address,
    uniqueCategories.length > 0 ? uniqueCategories : []
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push("/");
    }
  }, [hasHydrated, isAuthenticated, router]);

  // Show nothing while hydrating or if not authenticated after hydration
  if (!hasHydrated || (hasHydrated && !isAuthenticated)) return null;

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent overflow-hidden pb-24 md:pb-6">
      <BackgroundGradient />

      <TopBar title="Leaderboard" showTitle={true} showBackButton={true} backPath="/home" backTitle="Home" />

      {/* Desktop Navigation */}
      <DesktopNav />


      {/* Main Content */}
      <div className="relative z-10 flex-1 px-6 pb-6 max-w-6xl mx-auto w-full md:pb-32">
        {/* Leaderboard Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-semibold text-white tracking-tight">Top 10</h2>
            {timeRemaining && (
              <div className="bg-white/[0.08] backdrop-blur-sm border border-white/10 px-3 py-0 rounded-full">
                <span className="text-xs font-medium text-white/70">{timeRemaining}</span>
              </div>
            )}
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
            {leaderboardQuery.isPending ? (
              <div className="p-8 text-center text-white/40">Loading leaderboard...</div>
            ) : leaderboardQuery.isError ? (
              <div className="p-8 text-center text-red-400">
                Failed to load leaderboard
              </div>
            ) : leaderboardQuery.data?.leaderboard.length === 0 ? (
              <div className="p-8 text-center text-white/40">
                No participants yet. Be the first!
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {leaderboardQuery.data?.leaderboard.map((entry) => (
                  <LeaderboardEntry
                    key={entry.address}
                    entry={entry}
                    isCurrentUser={entry.address.toLowerCase() === address?.toLowerCase()}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Badge Progress Section - Hidden on mobile, shown on desktop */}
        <div className="hidden md:block">
          <h2 className="text-2xl font-semibold text-white mb-5 tracking-tight">Your Badges</h2>
          {allEventsQuery.isPending || allEventsQuery.isFetching ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-48 animate-pulse"
                />
              ))}
            </div>
          ) : allEventsQuery.isError ? (
            <div className="text-center py-8 text-red-400">Failed to load events</div>
          ) : uniqueCategories.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              No event categories available yet. Check back later!
            </div>
          ) : userCategoryStatsQuery.isPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-48 animate-pulse"
                />
              ))}
            </div>
          ) : userCategoryStatsQuery.isError ? (
            <div className="text-center py-8 text-red-400">Failed to load badge progress</div>
          ) : userCategoryStatsQuery.data?.categoryStats.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              Join events to start earning badges!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userCategoryStatsQuery.data?.categoryStats.map((stat) => (
                <BadgeCard key={stat.category} stat={stat} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Badge Carousel - Fixed at bottom */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/40 via-black/20 to-transparent backdrop-blur-md pb-20 pt-4">
        <div className="px-6 mb-3">
          <h3 className="text-lg font-semibold text-white tracking-tight">Your Badges</h3>
        </div>
        {allEventsQuery.isPending || allEventsQuery.isFetching ? (
          <div className="flex gap-3 px-6 overflow-x-auto pb-2 scrollbar-hide">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-64 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 h-36 animate-pulse"
              />
            ))}
          </div>
        ) : allEventsQuery.isError ? (
          <div className="px-6 text-center text-red-400 text-sm">Failed to load badges</div>
        ) : uniqueCategories.length === 0 ? (
          <div className="px-6 text-center text-white/40 text-sm">
            No badges available yet
          </div>
        ) : userCategoryStatsQuery.isPending ? (
          <div className="flex gap-3 px-6 overflow-x-auto pb-2 scrollbar-hide">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-64 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 h-36 animate-pulse"
              />
            ))}
          </div>
        ) : userCategoryStatsQuery.isError ? (
          <div className="px-6 text-center text-red-400 text-sm">Failed to load badges</div>
        ) : userCategoryStatsQuery.data?.categoryStats.length === 0 ? (
          <div className="px-6 text-center text-white/40 text-sm">
            Join events to start earning badges!
          </div>
        ) : (
          <div className="flex gap-3 px-6 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
            {userCategoryStatsQuery.data?.categoryStats.map((stat) => (
              <div key={stat.category} className="flex-shrink-0 w-64 snap-center">
                <BadgeCard stat={stat} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Leaderboard Entry Component
function LeaderboardEntry({
  entry,
  isCurrentUser,
}: {
  entry: {
    address: string;
    eventsJoined: number;
    rank: number;
    username?: string | null;
    displayName?: string | null;
    pfpUrl?: string | null;
  };
  isCurrentUser: boolean;
}) {
  const medal = getMedalInfo(entry.rank);
  const { data: farcasterData } = useFarcasterProfile(entry.address);
  const displayName = farcasterData?.display_name || entry.displayName || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`;
  const pfpUrl = farcasterData?.pfp_url || entry.pfpUrl;

  const MedalIcon = () => {
    if (medal.icon === "crown") {
      return (
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${medal.gradientFrom} ${medal.gradientTo} flex items-center justify-center`}>
          <Crown size={24} weight="fill" className="text-white" />
        </div>
      );
    } else if (medal.icon === "medal") {
      return (
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${medal.gradientFrom} ${medal.gradientTo} flex items-center justify-center`}>
          <Medal size={24} weight="fill" className="text-white" />
        </div>
      );
    } else {
      return (
        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <span className="text-sm font-bold text-white/60">#{entry.rank}</span>
        </div>
      );
    }
  };

  return (
    <div
      className={`flex items-center gap-4 p-5 transition-colors ${
        isCurrentUser ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
      }`}
    >
      {/* Rank/Medal */}
      <div className="flex-shrink-0">
        <MedalIcon />
      </div>

      {/* Profile Picture */}
      <div className="flex-shrink-0">
        {pfpUrl ? (
          <Image
            src={pfpUrl}
            alt={displayName}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full border border-white/20"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-white/[0.08] backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/80 font-semibold text-base">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name and Address */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white truncate text-base">{displayName}</div>
        <div className="text-xs text-white/40 truncate font-mono mt-0.5">
          {entry.address.slice(0, 10)}...{entry.address.slice(-8)}
        </div>
      </div>

      {/* Events Count */}
      <div className="flex-shrink-0 text-right min-w-[60px]">
        <div className="text-xl font-semibold text-white">{entry.eventsJoined}</div>
        <div className="text-xs text-white/40 mt-0.5">events</div>
      </div>

      {/* Current User Indicator */}
      {isCurrentUser && (
        <div className="flex-shrink-0">
          <span className="text-xs bg-white/10 text-white/70 px-3 py-1 rounded-full font-medium">
            You
          </span>
        </div>
      )}
    </div>
  );
}

// Badge Card Component
function BadgeCard({
  stat,
}: {
  stat: {
    category: string;
    eventsJoined: number;
    badgeLevel: string;
    progress: {
      current: number;
      nextLevel: number;
      percentage: number;
    };
  };
}) {
  const badgeInfo = BADGE_LEVELS[stat.badgeLevel as keyof typeof BADGE_LEVELS];
  const isLocked = stat.badgeLevel === "NONE";
  const categoryColor = getCategoryColor(stat.category);

  const BadgeIcon = () => {
    const iconSize = 28;
    if (isLocked) {
      return (
        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Lock size={iconSize} weight="regular" className="text-white/30" />
        </div>
      );
    }

    switch (stat.badgeLevel) {
      case "PLATINUM":
        return (
          <div className={`w-14 h-14 rounded-full ${categoryColor.bg} ${categoryColor.border} border-2 flex items-center justify-center`}>
            <Star size={iconSize} weight="fill" className={categoryColor.text} />
          </div>
        );
      case "GOLD":
        return (
          <div className={`w-14 h-14 rounded-full ${categoryColor.bg} ${categoryColor.border} border-2 flex items-center justify-center`}>
            <TrophyIcon size={iconSize} weight="fill" className={categoryColor.text} />
          </div>
        );
      case "SILVER":
        return (
          <div className={`w-14 h-14 rounded-full ${categoryColor.bg} ${categoryColor.border} border-2 flex items-center justify-center`}>
            <Medal size={iconSize} weight="fill" className={categoryColor.text} />
          </div>
        );
      default: // BRONZE
        return (
          <div className={`w-14 h-14 rounded-full ${categoryColor.bg} ${categoryColor.border} border-2 flex items-center justify-center`}>
            <Medal size={iconSize} weight="fill" className={categoryColor.text} />
          </div>
        );
    }
  };

  return (
    <div className={`${categoryColor.bg} backdrop-blur-sm ${categoryColor.border} border rounded-2xl p-4 hover:bg-opacity-80 transition-colors h-full`}>
      {/* Header: Category and Badge Icon */}
      <div className="flex justify-between items-start p-0 mb-3">
        <h3 className={`text-2xl md:text-3xl font-bold tracking-tight ${categoryColor.text}`}>{stat.category}</h3>
        <BadgeIcon />
      </div>

      {/* Badge Level Chip */}
      <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium mb-3 ${
        isLocked
          ? "bg-white/5 text-white/40"
          : `${categoryColor.bg} ${categoryColor.text} ${categoryColor.border} border`
      }`}>
        {badgeInfo.name}
      </div>

      {/* Progress Section */}
      {stat.badgeLevel !== "PLATINUM" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">Progress</span>
            <span className={`${categoryColor.text} font-medium`}>
              {stat.progress.current}/{stat.progress.nextLevel}
            </span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full ${categoryColor.bg} transition-all duration-500 rounded-full`}
              style={{ width: `${stat.progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {stat.badgeLevel === "PLATINUM" && (
        <div className="pt-1">
          <p className={`text-sm ${categoryColor.text} opacity-70`}>Max level</p>
        </div>
      )}
    </div>
  );
}
