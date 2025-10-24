"use client";

import { getCategoryColor } from "@/lib/utils/categoryColors";

interface EventHeaderProps {
  title: string;
  categories: string[];
  isEventOwner: boolean;
  activeTab: "details" | "attendees" | "comments";
  attendeesCount: number;
  onTabChange: (tab: "details" | "attendees" | "comments") => void;
}

export function EventHeader({
  title,
  categories,
  isEventOwner,
  activeTab,
  attendeesCount,
  onTabChange,
}: EventHeaderProps) {
  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-4xl sm:text-5xl md:text-6xl tracking-tighter font-bold text-white mb-4 sm:mb-5">
          {title}
        </h1>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const colors = getCategoryColor(category);
              return (
                <span
                  key={category}
                  className={`${colors.bg} ${colors.text} ${colors.border} inline-flex items-center rounded-full border px-3 py-1 text-xs sm:text-sm font-medium tracking-tight`}
                >
                  {category}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6 sm:mb-8 border-b border-white/10">
        <button
          type="button"
          onClick={() => onTabChange("details")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "details"
              ? "text-white border-white"
              : "text-white/50 border-transparent hover:text-white/70"
          }`}
        >
          Event Details
        </button>
        <button
          type="button"
          onClick={() => onTabChange("comments")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "comments"
              ? "text-white border-white"
              : "text-white/50 border-transparent hover:text-white/70"
          }`}
        >
          Comments
        </button>
        {isEventOwner && (
          <button
            type="button"
            onClick={() => onTabChange("attendees")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "attendees"
                ? "text-white border-white"
                : "text-white/50 border-transparent hover:text-white/70"
            }`}
          >
            Attendees ({attendeesCount})
          </button>
        )}
      </div>
    </div>
  );
}
