"use client";

import { BackgroundGradient } from "@/components/BackgroundGradient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarBlank, MapPin, Users, SignOut } from "phosphor-react";

// Mock event data - replace with actual data source
const events = [
  {
    id: 1,
    title: "Web3 Developer Meetup",
    description: "Join us for an evening of networking and learning about the latest in Web3 development",
    date: "2025-10-25",
    location: "San Francisco, CA",
    attendees: 45
  },
  {
    id: 2,
    title: "Blockchain Workshop",
    description: "Hands-on workshop covering smart contract development and DeFi protocols",
    date: "2025-11-02",
    location: "New York, NY",
    attendees: 32
  },
  {
    id: 3,
    title: "NFT Art Exhibition",
    description: "Explore the intersection of digital art and blockchain technology",
    date: "2025-11-10",
    location: "Los Angeles, CA",
    attendees: 78
  },
  {
    id: 4,
    title: "DeFi Summit 2025",
    description: "Annual summit bringing together DeFi leaders and innovators",
    date: "2025-11-18",
    location: "Austin, TX",
    attendees: 120
  }
];

export default function Home() {
  const router = useRouter();
  const [authInfo, setAuthInfo] = useState<{ address?: string } | null>(null);

  useEffect(() => {
    // Check if user authenticated via Base (stored in localStorage)
    if (typeof window !== 'undefined') {
      const baseAddress = localStorage.getItem('base_auth_address');
      if (baseAddress) {
        setAuthInfo({ address: baseAddress });
      }
    }
  }, []);

  const handleClose = () => {
    router.push('/');
  };

  return (
    <div className="relative min-h-screen flex flex-col p-6 bg-transparent overflow-hidden">
      <BackgroundGradient />

      {/* Logout button */}
      <button
        className="absolute top-6 right-6 z-20 text-white/40 hover:text-white/80 transition-colors"
        type="button"
        onClick={handleClose}
      >
        <SignOut size={24} weight="regular" />
      </button>

      {/* Header */}
      <div className="relative z-10 pt-8 pb-6">
        <h1 className="text-6xl tracking-tighter font-bold text-white/30 mb-2">
          Events
        </h1>
        {authInfo?.address && (
          <p className="text-sm text-white/50">
            Connected: {authInfo.address.slice(0, 6)}...{authInfo.address.slice(-4)}
          </p>
        )}
      </div>

      {/* Event cards */}
      <div className="relative z-10 flex-1 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl">
          {events.map((event) => (
            <Card key={event.id} className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all cursor-pointer flex flex-col p-6 gap-0">
              <div className="flex-1">
                <h3 className="text-white font-semibold text-lg mb-2">{event.title}</h3>
                <p className="text-white/60 text-sm mb-4">
                  {event.description}
                </p>
              </div>
              <div className="space-y-2 text-sm text-white/70 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <CalendarBlank size={16} weight="regular" />
                  <span>{new Date(event.date).toLocaleDateString('en-US', {
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
                  <span>{event.attendees} attendees</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
