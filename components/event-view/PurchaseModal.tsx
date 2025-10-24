"use client";

interface PurchaseModalProps {
  isOpen: boolean;
  isPurchasing: boolean;
  purchaseStage: "idle" | "validating" | "minting" | "confirming";
  event: {
    id: number;
    title: string;
    priceEth: string;
    attendees: number;
    maxAttendees: number;
    host: string;
    location: string;
  };
  contractAddress: string;
  onClose: () => void;
  onPurchase: () => void;
}

const shortenAddress = (address: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Unknown";

export function PurchaseModal({
  isOpen,
  isPurchasing,
  purchaseStage,
  event,
  contractAddress,
  onClose,
  onPurchase,
}: PurchaseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        aria-label="Close modal"
        onClick={() => !isPurchasing && onClose()}
        disabled={isPurchasing}
      />
      <div className="relative w-full max-w-[95vw] sm:max-w-lg md:max-w-xl bg-white/10 border border-white/20 rounded-3xl p-5 sm:p-6 md:p-8 backdrop-blur-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
        <button
          type="button"
          className="absolute top-4 right-4 text-white/50 hover:text-white/80 transition-colors"
          onClick={onClose}
          disabled={isPurchasing}
        >
          ✕
        </button>

        <div className="space-y-5">
          <div>
            <p className="text-white/50 text-xs uppercase tracking-[0.35em] mb-2">
              On-chain Event
            </p>
            <h2 className="text-white text-2xl sm:text-3xl font-bold">
              {event.title}
            </h2>
            <p className="text-white/60 mt-2 text-sm">
              Event #{event.id} • Contract{" "}
              <span className="font-mono">{shortenAddress(contractAddress)}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
              <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-1">
                Price
              </p>
              <p className="text-white text-2xl font-semibold">
                {Number(event.priceEth) > 0
                  ? `${Number(event.priceEth).toFixed(4)} ETH`
                  : "Free"}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
              <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-1">
                Remaining supply
              </p>
              <p className="text-white text-2xl font-semibold">
                {event.maxAttendees > 0
                  ? `${event.attendees}/${event.maxAttendees}`
                  : `${event.attendees} sold`}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
              <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-1">
                Host
              </p>
              <p className="text-white text-lg font-medium">{event.host}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
              <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-1">
                Location
              </p>
              <p className="text-white text-lg font-medium">{event.location}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPurchasing}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 sm:py-3.5 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onPurchase}
              disabled={isPurchasing}
              className="flex-1 bg-white text-gray-950 font-semibold py-3.5 sm:py-4 px-6 rounded-xl transition-all hover:bg-white/90 active:scale-[0.98] disabled:bg-white/30 disabled:text-gray-600 disabled:cursor-not-allowed shadow-none flex items-center justify-center gap-2"
            >
              {isPurchasing ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {purchaseStage === "validating" && "Validating..."}
                  {purchaseStage === "minting" && "Submitting on-chain..."}
                  {purchaseStage === "confirming" &&
                    "Waiting for confirmation..."}
                  {purchaseStage === "idle" && "Processing..."}
                </>
              ) : Number(event.priceEth) > 0 ? (
                "Purchase Ticket"
              ) : (
                "Mint Ticket"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
