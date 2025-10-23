"use client";

import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { parseEventMetadata } from "@/lib/utils/eventMetadata";
import { getCategoryColor } from "@/lib/utils/categoryColors";

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
  const categories = parsedMetadata.categories.length > 0 ? parsedMetadata.categories : ["Event"];

  const eventDate = new Date(event.date * 1000);

  // Format date and time cleanly
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
      month: "short",
      day: "numeric",
      year: eventDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }

  const formattedTime = eventDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card
      className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all duration-200 cursor-pointer overflow-hidden group py-4"
      onClick={() => router.push(`/event/${event.id}`)}
    >
      <div className="flex flex-col px-4">
        {/* Top section: Event info + Image */}
        <div className="flex gap-4">
          {/* Left: Event Info */}
          <div className="flex-1 flex flex-col min-w-0 gap-2.5">
            {/* Date & Time - First line, muted */}
            <p className="text-white/50 text-sm">
              {datePhrase} at {formattedTime}
            </p>

            {/* Event Title - Main color, bigger */}
            <h3 className="text-white font-semibold text-2xl leading-tight line-clamp-2">
              {event.name}
            </h3>

            {/* Creator with avatar */}
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-white/70 text-xs font-medium">
                  {getInitials(event.creator)}
                </span>
              </div>
              <span className="text-white/60 text-sm line-clamp-1">
                By {event.creator}
              </span>
            </div>

            {/* Location with icon */}
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-white/50" />
              </div>
              <span className="text-white/60 text-sm line-clamp-1">{event.location}</span>
            </div>
          </div>

          {/* Right: Image */}
          <div className="relative w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-white/[0.02]">
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
                sizes="112px"
                quality={75}
                loading="lazy"
                unoptimized={imageUrl.endsWith('.svg')}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-white/[0.03] to-white/[0.01]" />
            )}
          </div>
        </div>

        {/* Bottom section: Category chips - full width */}
        <div className="flex gap-1.5 pt-4 overflow-x-auto scrollbar-hide">
          {categories.map((category) => {
            const colors = getCategoryColor(category);
            return (
              <span
                key={category}
                className={`${colors.bg} ${colors.text} ${colors.border} border text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap flex-shrink-0`}
              >
                {category}
              </span>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
