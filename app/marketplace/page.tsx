"use client";

import { BackgroundGradient } from "@/components/layout/BackgroundGradient";
import { useEffect, useMemo, useRef } from "react";
import { useAuthCheck } from "@/lib/store/authStore";
import { useTicketStore } from "@/lib/store/ticketStore";
import { useMarketplace } from "@/lib/store/marketplaceStore";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { toast } from "sonner";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useConnect, useConnectors, usePublicClient, useWalletClient } from "wagmi";
import { currentChain } from "@/lib/chain";
import { EVENT_BOOK_ABI, EVENT_BOOK_ADDRESS } from "@/lib/contracts/eventBook";
import { ListingCard } from "./ListingCard";
import { ListingCardSkeleton } from "./ListingCardSkeleton";
import { PurchaseModal } from "./PurchaseModal";
import { UserListings } from "./UserListings";
import { DesktopNav } from "@/components/layout/DesktopNav";

import { useWalletAuth } from "@/lib/hooks/useWalletAuth";

// Types
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

// API
async function fetchListings({ pageParam = 0 }): Promise<ListingsResponse> {
  const response = await fetch(`/api/listings?offset=${pageParam}&limit=10`);
  if (!response.ok) throw new Error("Failed to fetch listings");
  return response.json();
}

export default function Marketplace() {
  useAuthCheck();
  const { tickets, cancelListing, clearDuplicates } = useTicketStore();
  const { selectedListing, isPurchasing, purchaseStage, setSelectedListing, setPurchasing } = useMarketplace();

  const observerTarget = useRef<HTMLDivElement>(null);
  const { address: walletAddress, isConnected } = useAccount();
  const { connect } = useConnect();
  const connectors = useConnectors();
  const publicClient = usePublicClient({ chainId: currentChain.id });
  const { data: walletClient } = useWalletClient({ chainId: currentChain.id });
  const queryClient = useQueryClient();
  const { ensureWalletConnected } = useWalletAuth();

  // Fetch listings with infinite scroll
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
    queryKey: ["listings"],
    queryFn: fetchListings,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.offset + lastPage.pagination.limit : undefined,
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
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Auto-connect wallet
  useEffect(() => {
    if (!isConnected || connectors.length === 0) return;
    const injected = connectors.find((connector) => connector.type === "injected");
    if (injected) connect({ connector: injected, chainId: currentChain.id });
  }, [connect, connectors, isConnected]);

  // Flatten listings
  const allListings = useMemo(() => data?.pages.flatMap((page) => page.listings) ?? [], [data]);

  // User listings with price sync
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
        if (!ticket.tokenId) return ticket;
        const priceFromChain = listingPriceByToken.get(ticket.tokenId);
        if (priceFromChain && priceFromChain !== ticket.listingPrice) {
          return { ...ticket, listingPrice: priceFromChain };
        }
        return ticket;
      });
  }, [tickets, allListings, walletAddress]);

  // Marketplace listings (exclude user's own)
  const marketplaceListings = useMemo(() => {
    if (!walletAddress) return allListings;
    const lowerAddress = walletAddress.toLowerCase();
    return allListings.filter((listing) => listing.seller.toLowerCase() !== lowerAddress);
  }, [allListings, walletAddress]);

  // Handle ticket purchase
  const handlePurchase = async (listing: Listing) => {
    const isConnected = await ensureWalletConnected();
    if (!isConnected) return;

    if (!walletAddress || !walletClient || !publicClient) {
      toast.error("Wallet required", { description: "Connect your wallet to buy tickets." });
      return;
    }

    if (listing.seller.toLowerCase() === walletAddress.toLowerCase()) {
      toast.error("Cannot buy your own ticket");
      return;
    }

    try {
      setPurchasing(true, "simulating");

      const { request } = await publicClient.simulateContract({
        account: walletAddress as `0x${string}`,
        address: EVENT_BOOK_ADDRESS,
        abi: EVENT_BOOK_ABI,
        functionName: "buyResaleTicket",
        args: [BigInt(listing.tokenId)],
        value: BigInt(listing.priceWei),
      });

      setPurchasing(true, "submitting");
      const hash = await walletClient.writeContract(request);

      setPurchasing(true, "confirming");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status !== "success") throw new Error("Transaction failed");

      toast.success("Ticket purchased", { description: "The ticket is now in your wallet." });
      setSelectedListing(null);

      // Invalidate caches
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["tickets", "address", walletAddress] }),
        refetch({ throwOnError: false }),
      ]);
      clearDuplicates();
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast.error("Purchase failed", { description: message });
    } finally {
      setPurchasing(false, "idle");
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent overflow-hidden pb-24 md:pb-6">
      <BackgroundGradient />
      <TopBar title="Marketplace" showTitle={true} />
      <DesktopNav />
      <BottomNav />

      {/* User's Listings - Only show when loaded and has tickets */}
      {!isLoading && userListedTickets.length > 0 && (
        <UserListings
          tickets={userListedTickets}
          onCancel={async (ticket) => {
            const isConnected = await ensureWalletConnected();
            if (!isConnected) return;

            if (!ticket.tokenId || !walletAddress || !walletClient || !publicClient) {
              toast.error("Missing required data");
              return;
            }

            try {
              const { request } = await publicClient.simulateContract({
                account: walletAddress as `0x${string}`,
                address: EVENT_BOOK_ADDRESS,
                abi: EVENT_BOOK_ABI,
                functionName: "cancelListing",
                args: [BigInt(ticket.tokenId)],
              });

              const hash = await walletClient.writeContract(request);
              const receipt = await publicClient.waitForTransactionReceipt({ hash });

              if (receipt.status !== "success") throw new Error("Transaction failed");

              toast.success("Listing cancelled");
              cancelListing(ticket.id);

              await Promise.allSettled([
                queryClient.invalidateQueries({ queryKey: ["tickets", "address", walletAddress] }),
                refetch({ throwOnError: false }),
              ]);
              clearDuplicates();
            } catch (error) {
              const message = error instanceof Error ? error.message : "Failed to cancel";
              toast.error("Unable to cancel listing", { description: message });
            }
          }}
        />
      )}

      {/* Marketplace Listings */}
      <div className="relative z-10 flex-1 px-6">
        {isError && (
          <div className="text-center py-12">
            <p className="text-red-400">Error loading listings: {error.message}</p>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : !isError && marketplaceListings.length === 0 && data?.pages.length ? (
          <div className="text-center py-12">
            <p className="text-white/60">No listings from other users yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl">
            {marketplaceListings.map((listing) => (
              <ListingCard
                key={listing.tokenId}
                listing={listing}
                onBuyClick={(listing) => setSelectedListing(listing)}
              />
            ))}
          </div>
        )}

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
          onClose={() => !isPurchasing && setSelectedListing(null)}
          onPurchase={handlePurchase}
          isPurchasing={isPurchasing}
          stage={purchaseStage}
        />
      )}
    </div>
  );
}
