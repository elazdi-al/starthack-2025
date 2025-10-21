"use client";

import { BackgroundGradient } from "@/components/BackgroundGradient";
import { EventCard } from "@/components/EventCard";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Ticket, Storefront, CalendarCheck } from "phosphor-react";
import { useAuthCheck } from "@/lib/store/authStore";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { useEvents } from "@/lib/hooks/useEvents";
import { toast } from "sonner";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthCheck();

  // Fetch events with TanStack Query (caching handled automatically)
  const eventsQuery = useEvents({ enabled: isAuthenticated && hasHydrated });

  // Filter upcoming events
  const upcomingEvents = useMemo(() => {
    if (!eventsQuery.data?.success) return [];
    return eventsQuery.data.events.filter((event) => !event.isPast);
  }, [eventsQuery.data]);

  const isLoadingEvents = eventsQuery.isPending || eventsQuery.isFetching;

  // Show error toast
  useEffect(() => {
    if (eventsQuery.isError) {
      const message =
        eventsQuery.error instanceof Error ? eventsQuery.error.message : "An unexpected error occurred";
      toast.error("Failed to load events", { description: message });
    }
  }, [eventsQuery.isError, eventsQuery.error]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push("/");
    }
  }, [hasHydrated, isAuthenticated, router]);

  // Loading state
  if (!hasHydrated) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-transparent">
        <BackgroundGradient />
        <div className="relative z-10 text-white/40">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent overflow-hidden pb-24 md:pb-6">
      <BackgroundGradient />

      <TopBar title="Events" showTitle={true} />

      {/* Desktop Navigation */}
      <div className="hidden md:flex absolute top-6 right-6 z-20 items-center gap-3">
        <CreateEventDialog onEventCreated={() => eventsQuery.refetch()} />
        <button
          className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-1.5 bg-white/5 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/10"
          type="button"
          onClick={() => router.push("/marketplace")}
          title="Marketplace"
        >
          <Storefront size={20} weight="regular" />
          <span className="text-sm">Marketplace</span>
        </button>
        <button
          className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-1.5 bg-white/5 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/10"
          type="button"
          onClick={() => router.push("/myevents")}
          title="My Events"
        >
          <CalendarCheck size={20} weight="regular" />
          <span className="text-sm">My Events</span>
        </button>
        <button
          className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-1.5 bg-white/5 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/10"
          type="button"
          onClick={() => router.push("/tickets")}
          title="My Tickets"
        >
          <Ticket size={20} weight="regular" />
          <span className="text-sm">My Tickets</span>
        </button>
      </div>

      {/* Mobile Navigation */}
      <BottomNav onEventCreated={() => eventsQuery.refetch()} />

      {/* Event cards */}
      <div className="relative z-10 flex-1 px-6">
        {isLoadingEvents ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-48 animate-pulse" />
            ))}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/40 text-lg">No upcoming events available</p>
            <p className="text-white/30 text-sm mt-2">Check back later for new events</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
