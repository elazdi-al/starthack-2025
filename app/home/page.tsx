"use client";

import { BackgroundGradient } from "@/components/layout/BackgroundGradient";
import { EventCard } from "@/components/home/EventCard";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuthCheck } from "@/lib/store/authStore";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopNav } from "@/components/layout/DesktopNav";
import { useEvents } from "@/lib/hooks/useEvents";
import { toast } from "sonner";
import { SearchBar } from "@/components/SearchBar";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthCheck();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch events with optimized multicall caching
  // All events are fetched in one batch and cached for 5 minutes
  const eventsQuery = useEvents({
    enabled: isAuthenticated && hasHydrated,
  });

  // Filter upcoming events (memoized to prevent recalculation)
  const upcomingEvents = useMemo(() => {
    if (!eventsQuery.data?.success) return [];
    return eventsQuery.data.events.filter((event) => !event.isPast);
  }, [eventsQuery.data]);

  // Filter events based on search query (instant client-side filtering)
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return upcomingEvents;

    const query = searchQuery.toLowerCase();
    return upcomingEvents.filter((event) => {
      const matchesName = event.name.toLowerCase().includes(query);
      const matchesLocation = event.location.toLowerCase().includes(query);
      return matchesName || matchesLocation;
    });
  }, [upcomingEvents, searchQuery]);

  // Handle search (debounced for better performance)
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

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

  // Show nothing while hydrating or if not authenticated after hydration
  if (!hasHydrated || (hasHydrated && !isAuthenticated)) return null;

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent overflow-hidden pb-24 md:pb-6">
      <BackgroundGradient />

      <TopBar title="Events" showTitle={true} />

      {/* Desktop Navigation - Fixed at top right */}
      <DesktopNav />

      {/* Search Bar */}
      <div className="relative z-10 px-6 pb-6 flex justify-center">
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Mobile Navigation */}
      <BottomNav />

      {/* Event cards */}
      <div className="relative z-10 flex-1 px-6 pb-6">
        {isLoadingEvents ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-48 animate-pulse" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery ? (
              <>
                <p className="text-white/40 text-lg">No events found matching &quot;{searchQuery}&quot;</p>
                <p className="text-white/30 text-sm mt-2">Try searching with different keywords</p>
              </>
            ) : upcomingEvents.length === 0 ? (
              <>
                <p className="text-white/40 text-lg">No upcoming events available</p>
                <p className="text-white/30 text-sm mt-2">Check back later for new events</p>
              </>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
