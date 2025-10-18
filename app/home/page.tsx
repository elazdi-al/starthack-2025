"use client";

import { BackgroundGradient } from "@/components/BackgroundGradient";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarBlank, MapPin, Users, SignOut, Ticket, Wallet, Storefront } from "phosphor-react";
import { useAuthCheck, useAuthStore } from "@/lib/store/authStore";
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
  const { isAuthenticated, address, hasHydrated } = useAuthCheck();
  const { clearAuth } = useAuthStore();
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  // Fetch wallet balance from API
  useEffect(() => {
    const fetchBalance = async () => {
      if (!address) return;

      try {
        setIsLoadingBalance(true);
        const response = await fetch(`/api/wallet/balance?address=${address}`);
        const data = await response.json();

        if (data.success) {
          setBalance(data.balance.eth);
        } else {
          console.error('Error fetching balance:', data.error);
          setBalance('0');
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance('0');
      } finally {
        setIsLoadingBalance(false);
      }
    };

    if (isAuthenticated && address) {
      fetchBalance();
    }
  }, [address, isAuthenticated]);

  // Fetch events from API
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoadingEvents(true);
        const response = await fetch('/api/events');
        const data = await response.json();
        console.log(data);

        if (data.success) {
          // Filter out past events and limit to upcoming events
          const upcomingEvents = data.events.filter((e: Event) => !e.isPast);
          setEvents(upcomingEvents);
        } else {
          console.error('Error fetching events:', data.error);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    if (isAuthenticated) {
      fetchEvents();
    }
  }, [isAuthenticated]);

  // Redirect to login if not authenticated (only after hydration)
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push('/');
    }
  }, [hasHydrated, isAuthenticated, router]);

  const handleSignOut = () => {
    clearAuth(); // Clear Zustand auth state
    router.push('/');
  };

  const handleMyTickets = () => {
    router.push('/tickets');
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
    <div className="relative min-h-screen flex flex-col p-6 bg-transparent overflow-hidden">
      <BackgroundGradient />

      {/* Navigation buttons */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        <button
          className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10"
          type="button"
          onClick={handleMarketplace}
          title="Marketplace"
        >
          <Storefront size={20} weight="regular" />
          <span className="text-sm">Marketplace</span>
        </button>
        <button
          className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10"
          type="button"
          onClick={handleMyTickets}
          title="My Tickets"
        >
          <Ticket size={20} weight="regular" />
          <span className="text-sm">My Tickets</span>
        </button>
        <button
          className="text-white/40 hover:text-white/80 transition-colors"
          type="button"
          onClick={handleSignOut}
          title="Sign Out"
        >
          <SignOut size={24} weight="regular" />
        </button>
      </div>

      {/* Header */}
      <div className="relative z-10 pt-8 pb-6">
        <h1 className="text-6xl tracking-tighter font-bold text-white/30 mb-2">
          Events
        </h1>
        {isAuthenticated && address && (
          <p className="text-sm text-white/50">
            Connected: {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        )}
      </div>

      {/* Wallet Balance Card */}
      {isAuthenticated && (
        <div className="relative z-10 mb-6 max-w-6xl">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-full">
                  <Wallet size={24} weight="regular" className="text-white/70" />
                </div>
                <div>
                  <p className="text-white/50 text-sm mb-1">Wallet Balance</p>
                  {isLoadingBalance ? (
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-8 bg-white/10 animate-pulse rounded"></div>
                      <span className="text-white/30 text-sm">Loading...</span>
                    </div>
                  ) : (
                    <p className="text-white text-3xl font-bold">
                      {balance ? parseFloat(balance).toFixed(4) : '0.0000'} <span className="text-xl text-white/50">ETH</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-xs mb-1">Base Mainnet</p>
                <div className="flex items-center gap-2 justify-end">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-white/50 text-sm">Connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event cards */}
      <div className="relative z-10 flex-1 pb-8">
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
