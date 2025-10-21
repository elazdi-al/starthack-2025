"use client";

import Image from "next/image";

interface FarcasterProfile {
  fid: number;
  username?: string | null;
  display_name?: string | null;
  pfp_url?: string | null;
  profile?: {
    bio?: {
      text?: string | null;
    };
  } | null;
  follower_count?: number;
  following_count?: number;
}

interface HostProfileProps {
  profile: FarcasterProfile | null;
  isLoading: boolean;
  onViewProfile: () => void;
}

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const formatCompactNumber = (value: number) =>
  compactNumberFormatter.format(value);

export function HostProfile({
  profile,
  isLoading,
  onViewProfile,
}: HostProfileProps) {
  if (isLoading && !profile) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6">
        <div className="text-white/60 text-sm">
          This host has not linked a Farcaster profile yet.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-white/10 bg-white/10 shrink-0">
          {profile.pfp_url ? (
            <Image
              src={profile.pfp_url}
              alt={`${
                profile.display_name ?? profile.username ?? "Farcaster user"
              } profile`}
              fill
              unoptimized
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/60 text-xl uppercase">
              {profile.display_name?.[0] ?? profile.username?.[0] ?? "?"}
            </div>
          )}
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-white text-lg sm:text-xl font-semibold">
              {profile.display_name ??
                profile.username ??
                `Farcaster #${profile.fid}`}
            </p>
            {profile.username && (
              <p className="text-white/60 text-sm">@{profile.username}</p>
            )}
          </div>
          {profile.profile?.bio?.text && (
            <p className="text-white/60 text-sm leading-relaxed">
              {profile.profile.bio.text}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-white/50 text-xs sm:text-sm">
            {typeof profile.follower_count === "number" && (
              <span>
                {formatCompactNumber(profile.follower_count)} followers
              </span>
            )}
            {typeof profile.following_count === "number" && (
              <span>Following {formatCompactNumber(profile.following_count)}</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onViewProfile}
          className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-xl transition-colors"
        >
          View Profile
        </button>
      </div>
    </div>
  );
}
