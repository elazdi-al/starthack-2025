import { CalendarBlank, ShoppingCart } from "phosphor-react";

interface Listing {
  tokenId: string;
  seller: string;
  price: string;
  priceWei: string;
  eventId: string;
  eventName: string;
  eventDate: number;
}

type PurchaseStage = "idle" | "simulating" | "submitting" | "confirming";

interface PurchaseModalProps {
  listing: Listing;
  onClose: () => void;
  onPurchase: (listing: Listing) => void;
  isPurchasing: boolean;
  stage: PurchaseStage;
}

const formatPrice = (price: string) => {
  const parsed = Number.parseFloat(price);
  if (Number.isNaN(parsed)) return price;
  if (parsed >= 1) return parsed.toFixed(3);
  if (parsed >= 0.01) return parsed.toFixed(4);
  return parsed.toFixed(6);
};

export function PurchaseModal({ listing, onClose, onPurchase, isPurchasing, stage }: PurchaseModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors"
          disabled={isPurchasing}
        >
          ✕
        </button>

        <div className="space-y-4">
          <h2 className="text-white text-2xl font-bold mb-4">Purchase Ticket</h2>

          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-lg">{listing.eventName}</h3>

            <div className="flex items-center gap-2 text-white/70 text-sm">
              <CalendarBlank size={16} weight="regular" />
              <span>
                {new Date(listing.eventDate * 1000).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>

            <div className="pt-3 border-t border-white/10">
              <p className="text-white/50 text-sm">Seller</p>
              <p className="text-white font-mono text-sm">
                {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
              </p>
            </div>

            <div className="pt-3 border-t border-white/10">
              <p className="text-white/50 text-sm">Price</p>
              <p className="text-white text-3xl font-bold">
                {formatPrice(listing.price)} <span className="text-lg text-white/50">ETH</span>
              </p>
            </div>
          </div>

          <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-3">
            <p className="text-blue-200 text-xs">
              Settlement happens entirely on-chain via the EventBook contract. Ensure you have enough ETH for the
              price and gas fees before confirming.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors"
              disabled={isPurchasing}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onPurchase(listing)}
              disabled={isPurchasing}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPurchasing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {stage === "simulating" && "Preparing transaction..."}
                  {stage === "submitting" && "Confirm in wallet..."}
                  {stage === "confirming" && "Waiting for confirmation..."}
                  {stage === "idle" && "Processing..."}
                </>
              ) : (
                <>
                  <ShoppingCart size={20} weight="regular" />
                  Buy Ticket
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
