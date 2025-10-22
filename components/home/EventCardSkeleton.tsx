"use client";

import { Card } from "@/components/ui/card";

export function EventCardSkeleton() {
  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10 flex flex-col p-6 gap-0 animate-pulse">
      <div className="flex-1">
        {/* Event name skeleton */}
        <div className="h-6 bg-white/10 rounded-md mb-2 w-3/4" />

        {/* Location skeleton */}
        <div className="h-4 bg-white/10 rounded-md mb-2 w-1/2" />

        {/* Tickets sold skeleton */}
        <div className="h-3 bg-white/10 rounded-md mb-4 w-2/5" />
      </div>

      <div className="space-y-2 pt-4 border-t border-white/10">
        {/* Calendar icon + date skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-white/10 rounded" />
          <div className="h-4 bg-white/10 rounded-md w-48" />
        </div>

        {/* Map icon + location skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-white/10 rounded" />
          <div className="h-4 bg-white/10 rounded-md w-32" />
        </div>

        {/* Users icon + attending skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-white/10 rounded" />
          <div className="h-4 bg-white/10 rounded-md w-24" />
        </div>
      </div>
    </Card>
  );
}
