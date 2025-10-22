"use client";

import { EventImage } from "./EventImage";
import { EventInfo } from "./EventInfo";
import { HostProfile } from "./HostProfile";
import { ShareNetwork } from "phosphor-react";
import { sdk } from "@farcaster/miniapp-sdk";
import { toast } from "sonner";
import { useState } from "react";

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

interface EventDetailsTabProps {
  event: {
    id: number;
    title: string;
    imageUri: string | null;
    date: string;
    time: string;
    venue: string;
    location: string;
    attendees: number;
    host: string;
    priceEth: string;
    maxAttendees: number;
    longDescription: string;
  };
  farcasterProfile: FarcasterProfile | null;
  isLoadingProfile: boolean;
  shouldShowProfile: boolean;
  onViewProfile: () => void;
}

export function EventDetailsTab({
  event,
  farcasterProfile,
  isLoadingProfile,
  shouldShowProfile,
  onViewProfile,
}: EventDetailsTabProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShareEvent = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    const configuredBase = process.env.NEXT_PUBLIC_URL;
    const runtimeOrigin = window.location.origin;
    const baseUrl =
      (configuredBase && configuredBase.length > 0 ? configuredBase : runtimeOrigin).replace(/\/$/, '');
    const eventUrl = `${baseUrl}/event/${event.id}`;
    const castText = `Check out this event "${event.title}" on the Stars App! Join us here: ${eventUrl}`;

    setIsSharing(true);

    try {
      const inMiniApp = await sdk.isInMiniApp();

      if (!inMiniApp) {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(eventUrl);
          } catch {
            // clipboard might be unavailable; fail silently
          }
        }
        toast.info('Open in Farcaster to share', {
          description: 'Share composer is only available inside the Farcaster app. The event link is copied.',
        });
        return;
      }

      const result = await sdk.actions.composeCast({
        text: castText,
        embeds: [eventUrl],
        channelKey: 'base',
      });

      if (result?.cast) {
        toast.success('Composer ready', {
          description: 'Finish the Base post to invite friends.',
        });
      } else {
        toast.info('Share canceled', {
          description: 'Cast composer was closed without posting.',
        });
      }
    } catch (error) {
      console.error('Failed to open Farcaster composer', error);
      toast.error('Share failed', {
        description:
          error instanceof Error ? error.message : 'Unexpected error while preparing the share.',
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 mb-8 sm:mb-12">
        <EventImage imageUri={event.imageUri} title={event.title} />
        <div className="flex-1">
          <EventInfo
            date={event.date}
            time={event.time}
            venue={event.venue}
            location={event.location}
            attendees={event.attendees}
            host={event.host}
            priceEth={event.priceEth}
            maxAttendees={event.maxAttendees}
          />
          
          {/* Share Button */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleShareEvent}
              disabled={isSharing}
              className="w-full bg-blue-500/20 hover:bg-blue-500/30 active:bg-blue-500/40 text-blue-200 font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-3 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSharing ? (
                <>
                  <span className="w-5 h-5 border-2 border-blue-200/30 border-t-transparent rounded-full animate-spin" />
                  <span>Sharing...</span>
                </>
              ) : (
                <>
                  <ShareNetwork size={24} weight="fill" />
                  <span>Share Event</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {event.longDescription && event.longDescription.trim().length > 0 && (
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-semibold text-white/90 mb-4 sm:mb-5">
            About
          </h2>
          <p className="text-base sm:text-lg text-white/60 leading-relaxed">
            {event.longDescription}
          </p>
        </div>
      )}

      {shouldShowProfile && (
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-semibold text-white/90 mb-4 sm:mb-5">
            Host on Base
          </h2>
          <HostProfile
            profile={farcasterProfile}
            isLoading={isLoadingProfile}
            onViewProfile={onViewProfile}
          />
        </div>
      )}
    </>
  );
}
