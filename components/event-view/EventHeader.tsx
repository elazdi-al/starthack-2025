"use client";

interface EventHeaderProps {
  title: string;
  category: string;
  isEventOwner: boolean;
  activeTab: "details" | "attendees";
  attendeesCount: number;
  onTabChange: (tab: "details" | "attendees") => void;
}

export function EventHeader({
  title,
  category,
  isEventOwner,
  activeTab,
  attendeesCount,
  onTabChange,
}: EventHeaderProps) {
  return (
    <div>
      <div className="mb-3 sm:mb-4">
        <span className="text-xs sm:text-sm px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50">
          {category}
        </span>
      </div>

      <h1 className="text-4xl sm:text-5xl md:text-6xl tracking-tighter font-bold text-white mb-6 sm:mb-8">
        {title}
      </h1>

      {isEventOwner && (
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
            onClick={() => onTabChange("attendees")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "attendees"
                ? "text-white border-white"
                : "text-white/50 border-transparent hover:text-white/70"
            }`}
          >
            Attendees ({attendeesCount})
          </button>
        </div>
      )}
    </div>
  );
}
