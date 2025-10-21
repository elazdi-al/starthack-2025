import { CalendarBlank, ShoppingCart } from "phosphor-react";
import { useRouter } from "next/navigation";

interface Listing {
  tokenId: string;
  seller: string;
  price: string;
  priceWei: string;
  eventId: string;
  eventName: string;
  eventDate: number;
}

interface ListingCardProps {
  listing: Listing;
  onBuyClick: (listing: Listing) => void;
}

const formatPrice = (price: string) => {
  const parsed = Number.parseFloat(price);
  if (Number.isNaN(parsed)) {
    return price;
  }

  if (parsed >= 1) {
    return parsed.toFixed(3);
  }

  if (parsed >= 0.01) {
    return parsed.toFixed(4);
  }

  return parsed.toFixed(6);
};

export function ListingCard({ listing, onBuyClick }: ListingCardProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all shadow-xl flex flex-col cursor-pointer text-left overflow-hidden"
      onClick={() => router.push(`/event/${listing.eventId}`)}
    >
      {/* Badges - Top Row */}
      <div className="flex justify-between items-center mb-4 w-full">
        <div className="bg-green-500/20 backdrop-blur-sm px-4 py-2 rounded-full">
          <p className="text-green-400 text-sm font-bold">
            {formatPrice(listing.price)} ETH
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
          <p className="text-white/70 text-sm font-medium">Resale</p>
        </div>
      </div>

      {/* Event title */}
      <h3 className="text-white font-bold text-xl mb-4 line-clamp-2">
        {listing.eventName}
      </h3>

      {/* Event Date */}
      <div className="flex items-start gap-3 mb-6">
        <CalendarBlank size={20} weight="regular" className="text-white/60 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-white/90 text-sm">
            {new Date(listing.eventDate * 1000).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Seller info */}
      <div className="mt-auto pt-4 border-t border-white/10 mb-4">
        <p className="text-white/40 text-xs mb-2">Seller</p>
        <p className="text-white/70 text-sm font-mono">
          {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
        </p>
      </div>

      {/* Buy button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onBuyClick(listing);
        }}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <ShoppingCart size={20} weight="regular" />
        Buy Ticket
      </button>
    </button>
  );
}
