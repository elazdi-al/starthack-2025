"use client";

import { EventImage } from "./EventImage";
import { EventInfo } from "./EventInfo";
import { HostProfile } from "./HostProfile";

interface EventDetailsTabProps {
  event: {
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
  farcasterProfile: any;
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
  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 mb-8 sm:mb-12">
        <EventImage imageUri={event.imageUri} title={event.title} />
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
      </div>

      <div className="mb-8 sm:mb-12">
        <h2 className="text-xl sm:text-2xl font-semibold text-white/90 mb-4 sm:mb-5">
          About
        </h2>
        <p className="text-base sm:text-lg text-white/60 leading-relaxed">
          {event.longDescription}
        </p>
      </div>

      {shouldShowProfile && (
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-semibold text-white/90 mb-4 sm:mb-5">
            Host on Farcaster
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
