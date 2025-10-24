"use client";

import { BackgroundGradient } from "@/components/layout/BackgroundGradient";
import { EventCard } from "@/components/home/EventCard";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useAuthCheck } from "@/lib/store/authStore";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopNav } from "@/components/layout/DesktopNav";
import { useInfiniteEvents } from "@/lib/hooks/useEvents";
import { toast } from "sonner";
import { SearchBar } from "@/components/home/SearchBar";
import { CategoryFilter } from "@/components/home/CategoryFilter";
import { parseEventMetadata } from "@/lib/utils/eventMetadata";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthCheck();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch ALL events first to get all categories (without filters)
  const allEventsForCategories = useInfiniteEvents({
    enabled: isAuthenticated && hasHydrated,
    limit: 50, // Larger limit to get more events for categories
    search: "", // No search filter for getting all categories
    category: "", // No category filter for getting all categories
  });

  // Fetch events with infinite scroll, on-chain search, and category filtering
  const eventsQuery = useInfiniteEvents({
    enabled: isAuthenticated && hasHydrated,
    limit: 20,
    search: searchQuery,
    category: selectedCategory || "",
  });

  // Flatten all pages into a single array of events
  const allEvents = useMemo(() => {
    if (!eventsQuery.data?.pages) return [];
    return eventsQuery.data.pages.flatMap((page) => page.events);
  }, [eventsQuery.data?.pages]);

  // Extract unique categories from ALL events (not just filtered ones)
  const uniqueCategories = useMemo(() => {
    const categorySet = new Set<string>();
    if (allEventsForCategories.data?.pages) {
      allEventsForCategories.data.pages.forEach((page) => {
        page.events.forEach((event) => {
          const metadata = parseEventMetadata(event.imageURI ?? null);
          metadata.categories.forEach((cat) => categorySet.add(cat));
        });
      });
    }
    return Array.from(categorySet).sort();
  }, [allEventsForCategories.data?.pages]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handle category selection
  const handleCategorySelect = useCallback((category: string | null) => {
    setSelectedCategory(category);
  }, []);

  const isLoadingEvents = eventsQuery.isPending || eventsQuery.isFetching;

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !eventsQuery.hasNextPage || eventsQuery.isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && eventsQuery.hasNextPage && !eventsQuery.isFetchingNextPage) {
          eventsQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [eventsQuery.hasNextPage, eventsQuery.isFetchingNextPage, eventsQuery]);

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

      <TopBar title="Events" showTitle={true} showLeaderboard={true} />

      {/* Desktop Navigation - Fixed at top right */}
      <DesktopNav />

      {/* Search Bar */}
      <div className="relative z-10 px-6 pb-4 flex justify-center">
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Category Filter - Horizontal scrollable on mobile */}
      {uniqueCategories.length > 0 && (
        <div className="relative z-10">
          <CategoryFilter
            categories={uniqueCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />
        </div>
      )}

      {/* Mobile Navigation */}
      <BottomNav />

      {/* Event cards */}
      <div className="relative z-10 flex-1 px-6 pb-6">
        {isLoadingEvents && allEvents.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-48 animate-pulse" />
            ))}
          </div>
        ) : allEvents.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery ? (
              <>
                <p className="text-white/40 text-lg">No events found matching &quot;{searchQuery}&quot;</p>
                <p className="text-white/30 text-sm mt-2">Try searching with different keywords</p>
              </>
            ) : (
              <>
                <p className="text-white/40 text-lg">No upcoming events available</p>
                <p className="text-white/30 text-sm mt-2">Check back later for new events</p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl">
              {allEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {/* Infinite scroll trigger */}
            <div ref={loadMoreRef} className="h-20 flex items-center justify-center mt-4">
              {eventsQuery.isFetchingNextPage && (
                <div className="text-white/40 text-sm">Loading more events...</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
