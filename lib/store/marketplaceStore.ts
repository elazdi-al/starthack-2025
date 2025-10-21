import { create } from "zustand";

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

interface MarketplaceState {
  // Modal state
  selectedListing: Listing | null;
  isPurchasing: boolean;
  purchaseStage: PurchaseStage;
  cancellingTokenId: string | null;

  // Actions
  setSelectedListing: (listing: Listing | null) => void;
  setPurchasing: (isPurchasing: boolean, stage?: PurchaseStage) => void;
  setCancellingTokenId: (tokenId: string | null) => void;
  reset: () => void;
}

export const useMarketplace = create<MarketplaceState>((set) => ({
  selectedListing: null,
  isPurchasing: false,
  purchaseStage: "idle",
  cancellingTokenId: null,

  setSelectedListing: (listing) =>
    set({ selectedListing: listing, purchaseStage: "idle" }),

  setPurchasing: (isPurchasing, stage = "idle") =>
    set({ isPurchasing, purchaseStage: stage }),

  setCancellingTokenId: (tokenId) =>
    set({ cancellingTokenId: tokenId }),

  reset: () =>
    set({
      selectedListing: null,
      isPurchasing: false,
      purchaseStage: "idle",
      cancellingTokenId: null,
    }),
}));
