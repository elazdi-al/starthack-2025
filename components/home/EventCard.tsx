"use client";

import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { parseEventMetadata } from "@/lib/utils/eventMetadata";

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
    imageURI?: string;
  };
}

export function EventCard({ event }: EventCardProps) {
  const router = useRouter();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const parsedMetadata = parseEventMetadata(event.imageURI ?? null);
  const imageUrl = parsedMetadata.imageUrl ?? (event.imageURI ?? null);

  const eventDate = new Date(event.date * 1000);

  // Format as a clean phrase
  const now = new Date();
  const isToday = eventDate.toDateString() === now.toDateString();
  const isTomorrow = eventDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();

  let datePhrase;
  if (isToday) {
    datePhrase = "Today";
  } else if (isTomorrow) {
    datePhrase = "Tomorrow";
  } else {
    datePhrase = eventDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: eventDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }

  const formattedTime = eventDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <Card
      className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all duration-200 cursor-pointer overflow-hidden group p-1"
      onClick={() => router.push(`/event/${event.id}`)}
    >
      <div className="flex gap-5 px-3 py-2.5">
        {/* Left: Square Image */}
        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-white/[0.02]">
          {/* Shimmer loading animation */}
          {imageLoading && imageUrl && !imageError && (
            <div className="absolute inset-0 animate-shimmer" />
          )}

          {imageUrl && !imageError ? (
            <Image
              src={imageUrl}
              alt={event.name}
              fill
              className={`object-cover transition-all duration-500 ${
                imageLoading ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
              }`}
              sizes="96px"
              quality={75}
              loading="lazy"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          ) : (
            // Clean minimal fallback
            <div className="w-full h-full bg-gradient-to-br from-white/[0.03] to-white/[0.01]" />
          )}
        </div>

        {/* Right: Event Info */}
        <div className="flex-1 flex flex-col min-w-0 py-0.5">
          {/* Title */}
          <h3 className="text-white font-semibold text-base mb-0.5 line-clamp-2 leading-snug">
            {event.name}
          </h3>

          {/* Location - subtle */}
          <p className="text-white/60 text-sm mb-1.5 line-clamp-1">
            {event.location}
          </p>

          {/* Capacity info - always show */}
          <p className="text-white/50 text-xs mb-1.5">
            {event.maxCapacity > 0
              ? `${event.ticketsSold} / ${event.maxCapacity} tickets sold`
              : `${event.ticketsSold} tickets sold`
            }
          </p>

          {/* Divider */}
          <div className="border-t border-white/10 pt-1.5 mt-auto space-y-1">
            {/* Date & Time */}
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-white/50 flex-shrink-0" strokeWidth={2} />
              <span className="text-white/70 text-sm">
                {datePhrase} at {formattedTime}
              </span>
            </div>

            {/* Location with icon */}
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-white/50 flex-shrink-0" strokeWidth={2} />
              <span className="text-white/70 text-sm line-clamp-1">{event.location}</span>
            </div>

            {/* Attending */}
            <div className="flex items-center gap-2">
              <Users size={15} className="text-white/50 flex-shrink-0" strokeWidth={2} />
              <span className="text-white/70 text-sm">{event.ticketsSold} attending</span>
            </div>

            {/* Event ended notice */}
            {event.isPast && (
              <div className="text-xs text-white/40 pt-0.5">
                This event has ended
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
