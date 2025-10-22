"use client";

import { BackgroundGradient } from "@/components/BackgroundGradient";
import { EventCard } from "@/components/EventCard";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAuthCheck } from "@/lib/store/authStore";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { useEvents } from "@/lib/hooks/useEvents";
import { useAccount } from "wagmi";
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

export default function MyEvents() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthCheck();
  const { address, isConnected } = useAccount();

  const eventsQuery = useEvents({ enabled: isAuthenticated && hasHydrated });

  // Filter events where current user is the creator
  const myEvents = useMemo(() => {
    if (!eventsQuery.data?.success || !address) {
      return [] as Event[];
    }
    return (eventsQuery.data.events as Event[]).filter(
      (event) => event.creator.toLowerCase() === address.toLowerCase()
    );
  }, [eventsQuery.data, address]);

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

  if (!address || !isConnected) {
    return (
      <div className="relative min-h-screen flex flex-col bg-transparent overflow-hidden pb-24 md:pb-6">
        <BackgroundGradient />

        <TopBar title="My Events" showTitle={true} />

        <div className="relative z-10 flex-1 px-6 flex flex-col items-center justify-center text-center space-y-3 text-white/60">
          <p className="text-lg font-medium">Connect your wallet to manage your events.</p>
          <p className="text-sm text-white/40">Use the button above or your browser wallet to continue.</p>
        </div>

        <BottomNav onEventCreated={() => eventsQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent overflow-hidden pb-24 md:pb-6">
      <BackgroundGradient />

      {/* Top bar with Title */}
      <TopBar title="My Events" showTitle={true} />

      {/* Desktop Navigation */}
      <div className="hidden md:flex absolute top-6 right-6 z-20 items-center gap-3">
        <CreateEventDialog onEventCreated={() => eventsQuery.refetch()} />
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
        ) : myEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/40 text-lg">You haven&apos;t created any events yet</p>
            <p className="text-white/30 text-sm mt-2">Create your first event to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl">
            {myEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
