"use client";

import { BackgroundGradient } from "@/components/BackgroundGradient";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarBlank, Users, ShoppingCart } from "phosphor-react";
import { useAuthCheck } from "@/lib/store/authStore";
import { useTicketStore } from "@/lib/store/ticketStore";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  useAccount,
  useConnect,
  useConnectors,
  usePublicClient,
  useWalletClient,
} from "wagmi";
import { useInvalidateEvents } from "@/lib/hooks/useEvents";
import { EVENT_BOOK_ABI, EVENT_BOOK_ADDRESS } from "@/lib/contracts/eventBook";

// Types for listings
interface Listing {
  tokenId: string;
  seller: string;
  price: string;
  priceWei: string;
  eventId: string;
  eventName: string;
  eventDate: number;
}

interface ListingsResponse {
  success: boolean;
  listings: Listing[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

type PurchaseStage = "idle" | "simulating" | "submitting" | "confirming";

// Fetch listings from API
async function fetchListings({ pageParam = 0 }): Promise<ListingsResponse> {
  const response = await fetch(`/api/listings?offset=${pageParam}&limit=10`);
  if (!response.ok) {
    throw new Error('Failed to fetch listings');
  }
  return response.json();
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

interface PurchaseModalProps {
  listing: Listing | null;
  onClose: () => void;
  onPurchase: (listing: Listing) => void;
  isPurchasing: boolean;
  stage: PurchaseStage;
}

function PurchaseModal({ listing, onClose, onPurchase, isPurchasing, stage }: PurchaseModalProps) {
  if (!listing) return null;

  const handlePurchase = () => {
    onPurchase(listing);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors"
          disabled={isPurchasing}
        >
          ✕
        </button>

        {/* Content */}
        <div className="space-y-4">
          <h2 className="text-white text-2xl font-bold mb-4">Purchase Ticket</h2>

          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-lg">{listing.eventName}</h3>

            <div className="flex items-center gap-2 text-white/70 text-sm">
              <CalendarBlank size={16} weight="regular" />
              <span>{new Date(listing.eventDate * 1000).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>

            <div className="pt-3 border-t border-white/10">
              <p className="text-white/50 text-sm">Seller</p>
              <p className="text-white font-mono text-sm">{listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</p>
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
              Settlement happens entirely on-chain via the EventBook contract. Ensure you have enough ETH for the price and gas fees before confirming.
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
              onClick={handlePurchase}
              disabled={isPurchasing}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default function Marketplace() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthCheck();
  const { tickets, cancelListing, clearDuplicates } = useTicketStore();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseStage, setPurchaseStage] = useState<PurchaseStage>("idle");
  const [cancellingTicketId, setCancellingTicketId] = useState<string | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const { address: walletAddress, isConnected } = useAccount();
  const { connect } = useConnect();
  const connectors = useConnectors();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { invalidateTickets } = useInvalidateEvents();

  // Infinite query for listings
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['listings'],
    queryFn: fetchListings,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.offset + lastPage.pagination.limit;
      }
      return undefined;
    },
    initialPageParam: 0,
  });

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || isConnected || connectors.length === 0) {
      return;
    }

    const injected = connectors.find((connector) => connector.type === "injected");
    if (injected) {
      connect({ connector: injected });
    }
  }, [connect, connectors, hasHydrated, isAuthenticated, isConnected]);

  // Flatten all pages into a single array
  const allListings = useMemo(
    () => data?.pages.flatMap((page) => page.listings) ?? [],
    [data]
  );

  const userListedTickets = useMemo(() => {
    const lowerWallet = walletAddress?.toLowerCase() ?? null;
    const listingPriceByToken = new Map<string, string>();

    if (lowerWallet) {
      allListings.forEach((listing) => {
        if (listing.seller.toLowerCase() === lowerWallet) {
          listingPriceByToken.set(listing.tokenId, listing.price);
        }
      });
    }

    return tickets
      .filter((ticket) => ticket.status === "listed")
      .map((ticket) => {
        if (!ticket.tokenId) {
          return ticket;
        }

        const priceFromChain = listingPriceByToken.get(ticket.tokenId);
        if (priceFromChain && priceFromChain !== ticket.listingPrice) {
          return { ...ticket, listingPrice: priceFromChain };
        }

        return ticket;
      });
  }, [tickets, allListings, walletAddress]);

  const marketplaceListings = useMemo(() => {
    if (!walletAddress) {
      return allListings;
    }
    const lowerAddress = walletAddress.toLowerCase();
    return allListings.filter(
      (listing) => listing.seller.toLowerCase() !== lowerAddress
    );
  }, [allListings, walletAddress]);

  // Redirect to login if not authenticated (only after hydration)
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push('/');
    }
  }, [hasHydrated, isAuthenticated, router]);

  const handlePurchase = useCallback(
    async (listing: Listing) => {
      if (!listing) {
        return;
      }

      if (!walletAddress) {
        toast.error("Wallet required", {
          description: "Connect your wallet to buy resale tickets.",
        });
        return;
      }

      if (!walletClient) {
        toast.error("Wallet unavailable", {
          description: "Reconnect your wallet and try again.",
        });
        return;
      }

      if (!publicClient) {
        toast.error("Network unavailable", {
          description: "Unable to reach the blockchain client right now.",
        });
        return;
      }

      if (listing.seller.toLowerCase() === walletAddress.toLowerCase()) {
        toast.error("Cannot buy your own ticket", {
          description: "Please select a ticket listed by another user.",
        });
        return;
      }

      try {
        setIsPurchasing(true);
        setPurchaseStage("simulating");

        const tokenId = BigInt(listing.tokenId);
        const value = BigInt(listing.priceWei);

        const { request } = await publicClient.simulateContract({
          account: walletAddress as `0x${string}`,
          address: EVENT_BOOK_ADDRESS,
          abi: EVENT_BOOK_ABI,
          functionName: "buyResaleTicket",
          args: [tokenId],
          value,
        });

        setPurchaseStage("submitting");

        const hash = await walletClient.writeContract(request);

        setPurchaseStage("confirming");

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status !== "success") {
          throw new Error("Transaction failed or reverted.");
        }

        toast.success("Ticket purchased", {
          description: "The ticket is now held by your wallet.",
        });

        setSelectedListing(null);

        const refreshTasks: Array<Promise<unknown>> = [];

        if (walletAddress) {
          refreshTasks.push(invalidateTickets(walletAddress));
        }

        refreshTasks.push(refetch({ throwOnError: false }));

        await Promise.allSettled(refreshTasks);
        clearDuplicates();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unexpected error occurred.";
        toast.error("Purchase failed", {
          description: message,
        });
      } finally {
        setIsPurchasing(false);
        setPurchaseStage("idle");
      }
    },
    [walletAddress, walletClient, publicClient, invalidateTickets, refetch, clearDuplicates, setSelectedListing]
  );

  const handleCancelListing = useCallback(
    async (ticket: { id: string; tokenId?: string }) => {
      if (!ticket.tokenId) {
        toast.error("Missing token information", {
          description: "Unable to locate the on-chain token id for this ticket.",
        });
        return;
      }

      if (!walletAddress) {
        toast.error("Wallet required", {
          description: "Connect your wallet to manage listings.",
        });
        return;
      }

      if (!walletClient) {
        toast.error("Wallet unavailable", {
          description: "Reconnect your wallet and try again.",
        });
        return;
      }

      if (!publicClient) {
        toast.error("Network unavailable", {
          description: "Unable to reach the blockchain client right now.",
        });
        return;
      }

      try {
        setCancellingTicketId(ticket.id);

        const tokenId = BigInt(ticket.tokenId);

        const { request } = await publicClient.simulateContract({
          account: walletAddress as `0x${string}`,
          address: EVENT_BOOK_ADDRESS,
          abi: EVENT_BOOK_ABI,
          functionName: "cancelListing",
          args: [tokenId],
        });

        const hash = await walletClient.writeContract(request);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status !== "success") {
          throw new Error("Transaction failed or reverted.");
        }

        toast.success("Listing cancelled", {
          description: "Your ticket is available to manage again.",
        });

        cancelListing(ticket.id);

        await Promise.allSettled([
          invalidateTickets(walletAddress),
          refetch({ throwOnError: false }),
        ]);
        clearDuplicates();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unexpected error occurred.";
        toast.error("Unable to cancel listing", {
          description: message,
        });
      } finally {
        setCancellingTicketId(null);
      }
    },
    [
      walletAddress,
      walletClient,
      publicClient,
      cancelListing,
      invalidateTickets,
      refetch,
      clearDuplicates,
    ]
  );

  // Show loading while hydrating
  if (!hasHydrated) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-transparent">
        <BackgroundGradient />
        <div className="relative z-10 text-white/40">Loading...</div>
      </div>
    );
  }

  // Will redirect if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent overflow-hidden pb-24 md:pb-6">
      <BackgroundGradient />

      {/* Top Bar with Title */}
      <TopBar title="Marketplace" showTitle={true} />

      {/* Bottom Navigation Bar - Mobile only */}
      <BottomNav />



      {/* User's Listed Tickets Section */}
      {userListedTickets.length > 0 && (
        <div className="relative z-10 mb-8 px-6 max-w-7xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white/70">Your Listings</h2>
            <span className="text-white/50 text-sm">{userListedTickets.length} active</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userListedTickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                className="bg-blue-500/10 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 shadow-xl cursor-pointer hover:bg-blue-500/20 transition-all text-left"
                onClick={() => ticket.eventId && router.push(`/event/${ticket.eventId}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-blue-500/20 px-3 py-1 rounded-full">
                    <p className="text-blue-400 text-sm font-bold">${ticket.listingPrice}</p>
                  </div>
                  <div className="bg-blue-500/20 px-2 py-1 rounded-full">
                    <p className="text-blue-300 text-xs">YOUR LISTING</p>
                  </div>
                </div>
                
                <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">
                  {ticket.eventTitle}
                </h3>
                
                <p className="text-white/70 text-sm mb-4">{ticket.ticketType}</p>
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click from firing
                    void handleCancelListing(ticket);
                  }}
                  disabled={cancellingTicketId === ticket.id}
                  className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {cancellingTicketId === ticket.id ? (
                    <>
                      <span className="w-3.5 h-3.5 border border-red-200/40 border-t-transparent rounded-full animate-spin" />
                      <span>Canceling...</span>
                    </>
                  ) : (
                    "Cancel Listing"
                  )}
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Marketplace Cards */}
      <div className="relative z-10 flex-1 px-6">
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {isError && (
          <div className="text-center py-12">
            <p className="text-red-400">Error loading listings: {error.message}</p>
          </div>
        )}

        {!isLoading && !isError && marketplaceListings.length === 0 && data?.pages.length && (
          <div className="text-center py-12">
            <p className="text-white/60">
              No listings from other users yet. Your active listings stay visible above.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl">
          {marketplaceListings.map((listing) => (
            <button
              key={listing.tokenId}
              type="button"
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all shadow-xl flex flex-col cursor-pointer text-left"
              onClick={() => router.push(`/event/${listing.eventId}`)}
            >
              {/* Price Badge */}
              <div className="flex justify-between items-start mb-4">
                <div className="bg-green-500/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <p className="text-green-400 text-sm font-bold">
                    {formatPrice(listing.price)} ETH
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                  <p className="text-white/70 text-xs">Resale</p>
                </div>
              </div>

              {/* Event title */}
              <h3 className="text-white font-bold text-xl mb-4 line-clamp-2">
                {listing.eventName}
              </h3>

              {/* Details */}
              <div className="space-y-3 flex-1">
                <div className="flex items-start gap-3">
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

                <div className="flex items-start gap-3">
                  <Users size={20} weight="regular" className="text-white/60 mt-0.5 flex-shrink-0" />
                  <p className="text-white/90 text-sm">Token ID: {listing.tokenId}</p>
                </div>
              </div>

              {/* Seller info */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-white/40 text-xs mb-2">Seller</p>
                <p className="text-white/70 text-sm font-mono">
                  {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                </p>
              </div>

              {/* Buy button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click from firing
                  setPurchaseStage("idle");
                  setSelectedListing(listing);
                }}
                className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart size={20} weight="regular" />
                Buy Ticket
              </button>
            </button>
          ))}
        </div>

        {/* Infinite scroll trigger */}
        {hasNextPage && (
          <div ref={observerTarget} className="flex justify-center py-8">
            {isFetchingNextPage && (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {selectedListing && (
        <PurchaseModal
          listing={selectedListing}
          onClose={() => {
            if (isPurchasing) return;
            setPurchaseStage("idle");
            setSelectedListing(null);
          }}
          onPurchase={handlePurchase}
          isPurchasing={isPurchasing}
          stage={purchaseStage}
        />
      )}
    </div>
  );
}
