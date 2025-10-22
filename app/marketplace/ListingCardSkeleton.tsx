export function ListingCardSkeleton() {
  return (
    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col overflow-hidden animate-pulse">
      {/* Badges - Top Row */}
      <div className="flex justify-between items-center mb-4 w-full">
        <div className="bg-white/10 px-4 py-2 rounded-full h-8 w-24" />
        <div className="bg-white/10 px-4 py-2 rounded-full h-8 w-16" />
      </div>

      {/* Event title */}
      <div className="h-6 bg-white/10 rounded-md mb-2 w-3/4" />
      <div className="h-6 bg-white/10 rounded-md mb-4 w-1/2" />

      {/* Event Date */}
      <div className="flex items-start gap-3 mb-6">
        <div className="h-5 w-5 bg-white/10 rounded mt-0.5" />
        <div className="h-4 bg-white/10 rounded-md w-56" />
      </div>

      {/* Seller info */}
      <div className="mt-auto pt-4 border-t border-white/10 mb-4">
        <div className="h-3 bg-white/10 rounded-md mb-2 w-12" />
        <div className="h-4 bg-white/10 rounded-md w-32" />
      </div>

      {/* Buy button */}
      <div className="w-full bg-white/10 h-12 rounded-xl" />
    </div>
  );
}
