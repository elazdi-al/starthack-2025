"use client";

import { CalendarBlank, MapPin, Users } from "phosphor-react";

interface EventInfoProps {
  date: string;
  time: string;
  venue: string;
  location: string;
  attendees: number;
  host: string;
  priceEth: string;
  maxAttendees: number;
}

export function EventInfo({
  date,
  time,
  venue,
  location,
  attendees,
  host,
  priceEth,
  maxAttendees,
}: EventInfoProps) {
  return (
    <div className="flex-1 space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <CalendarBlank
            size={20}
            weight="regular"
            className="text-white/40 mt-0.5 shrink-0"
          />
          <div>
            <p className="text-white text-base sm:text-lg">
              {new Date(date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="text-white/50 text-sm sm:text-base mt-0.5">{time}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 sm:gap-4">
          <MapPin
            size={20}
            weight="regular"
            className="text-white/40 mt-0.5 shrink-0"
          />
          <div>
            <p className="text-white text-base sm:text-lg">{venue}</p>
            <p className="text-white/50 text-sm sm:text-base mt-0.5">
              {location}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 sm:gap-4">
          <Users
            size={20}
            weight="regular"
            className="text-white/40 mt-0.5 shrink-0"
          />
          <div>
            <p className="text-white text-base sm:text-lg">
              {attendees} attending
            </p>
            <p className="text-white/50 text-sm sm:text-base mt-0.5">
              Hosted by {host}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-4 sm:p-5">
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-1">
            Price
          </p>
          <p className="text-white text-2xl font-semibold">
            {Number(priceEth) > 0
              ? `${Number(priceEth).toFixed(4)} ETH`
              : "Free"}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-4 sm:p-5">
          <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-1">
            Capacity
          </p>
          <p className="text-white text-2xl font-semibold">
            {maxAttendees > 0
              ? `${attendees}/${maxAttendees}`
              : `${attendees} attending`}
          </p>
        </div>
      </div>
    </div>
  );
}
