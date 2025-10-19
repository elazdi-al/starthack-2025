"use client";

import { useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { sdk } from "@farcaster/miniapp-sdk";

interface FarcasterProfile {
  fid: number;
  username: string | null;
  display_name: string | null;
  pfp_url: string | null;
  profile: {
    bio: {
      text: string;
    };
  } | null;
  follower_count: number;
  following_count: number;
}

interface Attendee {
  address: string;
  farcasterProfile: FarcasterProfile | null;
}

interface AttendeesListProps {
  attendees: Attendee[];
  isLoading: boolean;
}

const shortenAddress = (address: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Unknown";

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const formatCompactNumber = (value: number) =>
  compactNumberFormatter.format(value);

export function AttendeesList({ attendees, isLoading }: AttendeesListProps) {
  const handleViewProfile = useCallback(async (fid: number) => {
    try {
      const inMiniApp = await sdk.isInMiniApp();

      if (!inMiniApp) {
        toast.info("Open in Farcaster", {
          description: "Profile viewing is available from inside the Farcaster app.",
        });
        return;
      }

      if (typeof sdk.actions?.viewProfile !== "function") {
        toast.error("Unsupported action", {
          description: "This Farcaster client does not support opening profiles.",
        });
        return;
      }

      await sdk.actions.viewProfile({ fid });
    } catch (error) {
      console.error("Failed to open Farcaster profile", error);
      toast.error("Unable to open profile", {
        description:
          error instanceof Error
            ? error.message
            : "Unexpected error while opening the Farcaster profile.",
      });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 animate-pulse"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-1/3" />
                <div className="h-3 bg-white/10 rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (attendees.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <p className="text-white/60">No attendees yet</p>
        <p className="text-white/40 text-sm mt-1">
          Attendees will appear here once tickets are purchased
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {attendees.map((attendee) => {
        const profile = attendee.farcasterProfile;

        return (
          <div
            key={attendee.address}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-4">
              {/* Profile Picture */}
              <div className="relative w-14 h-14 rounded-full overflow-hidden border border-white/10 bg-white/10 shrink-0">
                {profile?.pfp_url ? (
                  <Image
                    src={profile.pfp_url}
                    alt={`${
                      profile.display_name ?? profile.username ?? "User"
                    } profile`}
                    fill
                    unoptimized
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/60 text-lg uppercase">
                    {profile?.display_name?.[0] ??
                      profile?.username?.[0] ??
                      attendee.address.slice(2, 4)}
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                {profile ? (
                  <>
                    <p className="text-white text-base font-semibold truncate">
                      {profile.display_name ??
                        profile.username ??
                        `Farcaster #${profile.fid}`}
                    </p>
                    <p className="text-white/60 text-sm truncate">
                      {profile.username
                        ? `@${profile.username}`
                        : shortenAddress(attendee.address)}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-white/50 text-xs">
                      {typeof profile.follower_count === "number" && (
                        <span>
                          {formatCompactNumber(profile.follower_count)}{" "}
                          followers
                        </span>
                      )}
                      <span>FID {profile.fid}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-white text-base font-semibold truncate">
                      {shortenAddress(attendee.address)}
                    </p>
                    <p className="text-white/60 text-sm">No Farcaster profile</p>
                  </>
                )}
              </div>

              {/* View Profile Button */}
              {profile && (
                <button
                  type="button"
                  onClick={() => handleViewProfile(profile.fid)}
                  className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shrink-0"
                >
                  View
                </button>
              )}
            </div>

            {/* Bio */}
            {profile?.profile?.bio?.text && (
              <p className="text-white/60 text-sm mt-3 leading-relaxed line-clamp-2">
                {profile.profile.bio.text}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
