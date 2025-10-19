"use client";

import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { CalendarBlank, MapPin, Users } from "phosphor-react";

interface EventCardProps {
  event: {
    id: number;
    name: string;
    location: string;
    date: number;
    price: string;
    creator: string;
    ticketsSold: number;
    maxCapacity: number;
    isPast: boolean;
  };
}

export function EventCard({ event }: EventCardProps) {
  const router = useRouter();

  return (
    <Card
      className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all cursor-pointer flex flex-col p-6 gap-0"
      onClick={() => router.push(`/event/${event.id}`)}
    >
      <div className="flex-1">
        <h3 className="text-white font-semibold text-lg mb-2">{event.name}</h3>
        <p className="text-white/60 text-sm mb-2">{event.location}</p>
        {event.maxCapacity > 0 && (
          <p className="text-white/50 text-xs mb-4">
            {event.ticketsSold} / {event.maxCapacity} tickets sold
          </p>
        )}
      </div>
      <div className="space-y-2 text-sm text-white/70 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <CalendarBlank size={16} weight="regular" />
          <span>
            {new Date(event.date * 1000).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={16} weight="regular" />
          <span>{event.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={16} weight="regular" />
          <span>{event.ticketsSold} attending</span>
        </div>
        {event.isPast && (
          <div className="text-xs text-white/40 pt-2">This event has ended</div>
        )}
      </div>
    </Card>
  );
}

