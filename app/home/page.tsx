"use client";

import { BackgroundGradient } from "@/components/BackgroundGradient";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { CalendarBlank, MapPin, Users, Ticket, Storefront, CalendarCheck } from "phosphor-react";
import { useAuthCheck } from "@/lib/store/authStore";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { useEvents } from "@/lib/hooks/useEvents";
import { toast } from "sonner";
interface Event {
  id: number;
  name: string;
  location: string;
  date: number;
  price: string;
  creator: string;
  ticketsSold: number;
  maxCapacity: number;
  isPast: boolean;
}

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthCheck();

  const eventsQuery = useEvents({ enabled: isAuthenticated && hasHydrated });

  const events = useMemo(() => {
    if (!eventsQuery.data?.success) {
      return [] as Event[];
    }
    return (eventsQuery.data.events as Event[]).filter((event) => !event.isPast);
  }, [eventsQuery.data]);

  const isLoadingEvents = eventsQuery.isPending || eventsQuery.isFetching;

  useEffect(() => {
    if (eventsQuery.isError) {
      const message =
        eventsQuery.error instanceof Error
          ? eventsQuery.error.message
          : "An unexpected error occurred";
      toast.error("Failed to load events", { description: message });
    }
  }, [eventsQuery.isError, eventsQuery.error]);

  // Redirect to login if not authenticated (only after hydration)
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push('/');
    }
  }, [hasHydrated, isAuthenticated, router]);

  const handleMyTickets = () => {
    router.push('/tickets');
  };

  const handleMyEvents = () => {
    router.push('/my-events');
  };

  const handleMarketplace = () => {
    router.push('/marketplace');
  };

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

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent overflow-hidden pb-24 md:pb-6">
      <BackgroundGradient />

      {/* Top bar with Title - Using unified TopBar component */}
      <TopBar title="Events" showTitle={true} />

      {/* Additional Desktop Navigation */}
      <div className="hidden md:flex absolute top-6 right-6 z-20 items-center gap-3">
        <CreateEventDialog onEventCreated={() => eventsQuery.refetch()} />
        <button
          className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-1.5 bg-white/5 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/10"
          type="button"
          onClick={handleMarketplace}
          title="Marketplace"
        >
          <Storefront size={20} weight="regular" />
          <span className="text-sm">Marketplace</span>
        </button>
        <button
          className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-1.5 bg-white/5 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/10"
          type="button"
          onClick={handleMyEvents}
          title="My Events"
        >
          <CalendarCheck size={20} weight="regular" />
          <span className="text-sm">My Events</span>
        </button>
        <button
          className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-1.5 bg-white/5 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/10"
          type="button"
          onClick={handleMyTickets}
          title="My Tickets"
        >
          <Ticket size={20} weight="regular" />
          <span className="text-sm">My Tickets</span>
        </button>
      </div>

      {/* Bottom Navigation Bar - Mobile only */}
      <BottomNav onEventCreated={() => eventsQuery.refetch()} />

      {/* Event cards */}
      <div className="relative z-10 flex-1 px-6">
        {isLoadingEvents ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-48 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/40 text-lg">No upcoming events available</p>
            <p className="text-white/30 text-sm mt-2">Check back later for new events</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl">
            {events.map((event) => (
              <Card
                key={event.id}
                className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all cursor-pointer flex flex-col p-6 gap-0"
                onClick={() => router.push(`/event/${event.id}`)}
              >
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-2">{event.name}</h3>
                  <p className="text-white/60 text-sm mb-2">
                    {event.location}
                  </p>
                  {event.maxCapacity > 0 && (
                    <p className="text-white/50 text-xs mb-4">
                      {event.ticketsSold} / {event.maxCapacity} tickets sold
                    </p>
                  )}
                </div>
                <div className="space-y-2 text-sm text-white/70 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <CalendarBlank size={16} weight="regular" />
                    <span>{new Date(event.date * 1000).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} weight="regular" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} weight="regular" />
                    <span>{event.ticketsSold} attending</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
