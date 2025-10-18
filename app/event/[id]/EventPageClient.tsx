"use client";

import { BackgroundGradient } from "@/components/BackgroundGradient";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CalendarBlank, MapPin, Users } from "phosphor-react";
import { useAuthCheck } from "@/lib/store/authStore";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";

interface Event {
  id: number;
  title: string;
  description: string;
  longDescription: string;
  date: string;
  time: string;
  location: string;
  venue: string;
  attendees: number;
  maxAttendees: number;
  category: string;
  host: string;
}

export default function EventPageClient({ event }: { event: Event | undefined }) {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthCheck();

  // Redirect to login if not authenticated (only after hydration)
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push("/");
    }
  }, [hasHydrated, isAuthenticated, router]);

  // Show loading while hydrating
  if (!hasHydrated) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-transparent">
        <BackgroundGradient />
        <div className="relative z-10 text-white/40">Loading...</div>
      </div>
    );
  }

  // Will redirect if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (!event) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-transparent overflow-hidden">
        <BackgroundGradient />
        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-bold text-white/30 mb-4">
            Event Not Found
          </h1>
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="text-white/60 hover:text-white/80 transition-colors"
          >
            Return to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent overflow-hidden pb-24 md:pb-6">
      <BackgroundGradient />

      {/* Top Bar with Back Button */}
      <TopBar showBackButton={true} backPath="/home" backTitle="Back to Events" />

      {/* Bottom Navigation Bar - Mobile only */}
      <BottomNav />

      {/* Main content */}
      <div className="relative z-10 flex-1 pb-6 max-w-3xl mx-auto w-full px-6">
        {/* Category badge */}
        <div className="mb-4">
          <span className="text-xs sm:text-sm px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50">
            {event.category}
          </span>
        </div>

        {/* Event title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl tracking-tighter font-bold text-white mb-6 sm:mb-8">
          {event.title}
        </h1>

        {/* Event info - Clean list */}
        <div className="space-y-4 sm:space-y-5 mb-8 sm:mb-12">
          <div className="flex items-start gap-3 sm:gap-4">
            <CalendarBlank
              size={20}
              weight="regular"
              className="text-white/40 mt-0.5 shrink-0"
            />
            <div>
              <p className="text-white text-base sm:text-lg">
                {new Date(event.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-white/50 text-sm sm:text-base mt-0.5">
                {event.time}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 sm:gap-4">
            <MapPin
              size={20}
              weight="regular"
              className="text-white/40 mt-0.5 shrink-0"
            />
            <div>
              <p className="text-white text-base sm:text-lg">{event.venue}</p>
              <p className="text-white/50 text-sm sm:text-base mt-0.5">
                {event.location}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 sm:gap-4">
            <Users
              size={20}
              weight="regular"
              className="text-white/40 mt-0.5 shrink-0"
            />
            <div>
              <p className="text-white text-base sm:text-lg">
                {event.attendees} attending
              </p>
              <p className="text-white/50 text-sm sm:text-base mt-0.5">
                Hosted by {event.host}
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-white/10 mb-8 sm:mb-12" />

        {/* Description */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-semibold text-white/90 mb-4 sm:mb-5">
            About
          </h2>
          <p className="text-base sm:text-lg text-white/60 leading-relaxed">
            {event.longDescription}
          </p>
        </div>

        {/* Action button - Fixed at bottom on mobile */}
        <div className="fixed sm:relative bottom-0 left-0 right-0 px-6 py-4 sm:p-0 bg-gradient-to-t sm:bg-none from-gray-950 via-gray-950/90 to-transparent sm:from-transparent sm:via-transparent z-20">
          <button type="button" className="w-full bg-white text-gray-950 font-semibold py-3.5 sm:py-4 px-6 rounded-xl transition-all hover:bg-white/90 active:scale-[0.98] shadow-lg">
            Register for Event
          </button>
        </div>
      </div>
    </div>
  );
}

