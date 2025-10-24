"use client";

import { BackgroundGradient } from "@/components/layout/BackgroundGradient";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { DesktopNav } from "@/components/layout/DesktopNav";
import { EVENT_BOOK_ABI, EVENT_BOOK_ADDRESS } from "@/lib/contracts/eventBook";
import { TICKET_ABI, TICKET_CONTRACT_ADDRESS } from "@/lib/contracts/ticket";
import { useInvalidateEvents, useTickets } from "@/lib/hooks/useEvents";
import { useAuthCheck } from "@/lib/store/authStore";
import { type Ticket, useTicketStore } from "@/lib/store/ticketStore";
import { sdk } from "@farcaster/miniapp-sdk";
import { useRouter } from "next/navigation";
import { Tag, Ticket as TicketIcon } from "phosphor-react";
import { TicketCard, TicketCardSkeleton } from "@/components/tickets/TicketCard";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { parseEther } from "viem";
import {
  useAccount,
  useConnect,
  useConnectors,
  usePublicClient,
  useWalletClient,
} from "wagmi";
import { currentChain } from "@/lib/chain";
import { useWalletAuth } from "@/lib/hooks/useWalletAuth";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

type ListingStage = "idle" | "approving" | "listing" | "confirming";

export default function MyTickets() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthCheck();
  const { tickets, setTickets, listTicket, cancelListing, clearDuplicates } = useTicketStore();
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [qrSize, setQrSize] = useState(200);
  const [listingTicket, setListingTicket] = useState<Ticket | null>(null);
  const [listingPrice, setListingPrice] = useState("");
  const [isListing, setIsListing] = useState(false);
  const [listingStage, setListingStage] = useState<ListingStage>("idle");
  const [sharingTicketId, setSharingTicketId] = useState<string | null>(null);
  const [cancellingTicketId, setCancellingTicketId] = useState<string | null>(null);
  const trimmedListingPrice = listingPrice.trim();
  const { address: walletAddress, isConnected} = useAccount();
  const { connect } = useConnect();
  const connectors = useConnectors();
  const publicClient = usePublicClient({ chainId: currentChain.id });
  const { data: walletClient } = useWalletClient({ chainId: currentChain.id });
  const { invalidateTickets } = useInvalidateEvents();
  const { ensureWalletConnected } = useWalletAuth();

  const activeAddress = isAuthenticated && hasHydrated ? walletAddress ?? null : null;
  const ticketsQuery = useTickets(activeAddress);
  const isLoadingTickets = ticketsQuery.isPending;
  const refetchTickets = ticketsQuery.refetch;

  // Clear duplicates on mount
  useEffect(() => {
    clearDuplicates();
  }, [clearDuplicates]);

  useEffect(() => {
    if (ticketsQuery.data?.success && ticketsQuery.data.tickets) {
      setTickets(ticketsQuery.data.tickets);
    }
  }, [ticketsQuery.data, setTickets]);

  useEffect(() => {
    if (hasHydrated && isAuthenticated && activeAddress) {
      void refetchTickets({ throwOnError: false });
    }
  }, [hasHydrated, isAuthenticated, activeAddress, refetchTickets]);

  useEffect(() => {
    if (ticketsQuery.isError) {
      const message =
        ticketsQuery.error instanceof Error
          ? ticketsQuery.error.message
          : 'Failed to load tickets';
      toast.error('Failed to load tickets', { description: message });
    }
  }, [ticketsQuery.isError, ticketsQuery.error]);

  // Handle responsive QR code size
  useEffect(() => {
    const handleResize = () => {
      setQrSize(window.innerWidth < 640 ? 160 : 200);
    };

    // Set initial size
    handleResize();

    // Add resize listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redirect to login if not authenticated (only after hydration)
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push("/");
    }
  }, [hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || isConnected || connectors.length === 0) {
      return;
    }

    const injected = connectors.find((connector) => connector.type === "injected");
    if (injected) {
      connect({ connector: injected, chainId: currentChain.id });
    }
  }, [connect, connectors, hasHydrated, isAuthenticated, isConnected]);

  const canListTicket = useCallback((ticket: Ticket): boolean => {
    const eventDate = new Date(ticket.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time for fair comparison
    const dateValid = eventDate >= now;
    return dateValid && ticket.status === 'owned';
  }, []);



  const confirmListing = useCallback(async () => {
    if (!listingTicket) {
      return;
    }

    const isConnected = await ensureWalletConnected();
    if (!isConnected) return;

    const trimmedPrice = trimmedListingPrice;
    if (!trimmedPrice) {
      toast.error("Enter a price", {
        description: "Please provide an amount in ETH to list this ticket.",
      });
      return;
    }

    let priceWei: bigint;
    try {
      priceWei = parseEther(trimmedPrice);
    } catch {
      toast.error("Invalid price", {
        description: "Enter a valid ETH amount, e.g. 0.05",
      });
      return;
    }

    if (priceWei <= BigInt(0)) {
      toast.error("Price must be positive", {
        description: "Listing price must be greater than 0 ETH.",
      });
      return;
    }

    if (!listingTicket.tokenId) {
      toast.error("Missing token information", {
        description: "Unable to locate the on-chain token id for this ticket.",
      });
      return;
    }

    if (!walletAddress) {
      toast.error("Wallet required", {
        description: "Connect your wallet to list tickets for sale.",
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

    const tokenId = BigInt(listingTicket.tokenId);

    try {
      setIsListing(true);
      setListingStage("approving");

      const approvedFor = (await publicClient.readContract({
        address: TICKET_CONTRACT_ADDRESS,
        abi: TICKET_ABI,
        functionName: "getApproved",
        args: [tokenId],
      })) as `0x${string}`;

      if (approvedFor.toLowerCase() !== EVENT_BOOK_ADDRESS.toLowerCase()) {
        const { request: approveRequest } = await publicClient.simulateContract({
          account: walletAddress as `0x${string}`,
          address: TICKET_CONTRACT_ADDRESS,
          abi: TICKET_ABI,
          functionName: "approve",
          args: [EVENT_BOOK_ADDRESS, tokenId],
        });

        const approveHash = await walletClient.writeContract(approveRequest);
        await publicClient.waitForTransactionReceipt({ hash: approveHash });

        // Poll for approval status after the approve transaction is confirmed
        let approvalConfirmed = false;
        for (let i = 0; i < 5; i++) { // Try up to 5 times
          await delay(500); // Wait 500ms
          const currentApprovedFor = (await publicClient.readContract({
            address: TICKET_CONTRACT_ADDRESS,
            abi: TICKET_ABI,
            functionName: "getApproved",
            args: [tokenId],
          })) as `0x${string}`;

          if (currentApprovedFor.toLowerCase() === EVENT_BOOK_ADDRESS.toLowerCase()) {
            approvalConfirmed = true;
            break;
          }
        }

        if (!approvalConfirmed) {
          throw new Error("Approval failed to register on-chain after multiple attempts. Please try again.");
        }
      }

      setListingStage("listing");

      const { request } = await publicClient.simulateContract({
        account: walletAddress as `0x${string}`,
        address: EVENT_BOOK_ADDRESS,
        abi: EVENT_BOOK_ABI,
        functionName: "listTicketForSale",
        args: [tokenId, priceWei],
      });

      setListingStage("confirming");

      const hash = await walletClient.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status !== "success") {
        throw new Error("Transaction failed or reverted.");
      }

      toast.success("Ticket listed", {
        description: `Listing created at ${trimmedPrice} ETH.`,
      });

      listTicket(listingTicket.id, trimmedPrice);
      setListingTicket(null);
      setListingPrice("");
      setListingStage("idle");

      await Promise.allSettled([
        invalidateTickets(walletAddress),
        refetchTickets({ throwOnError: false }),
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred.";
      toast.error("Listing failed", {
        description: message,
      });
    } finally {
      setIsListing(false);
      setListingStage("idle");
    }
  }, [
    ensureWalletConnected,
    invalidateTickets,
    listTicket,
    trimmedListingPrice,
    listingTicket,
    publicClient,
    refetchTickets,
    walletAddress,
    walletClient,
  ]);

  const handleCancelListing = useCallback(
    async (ticket: Ticket) => {
      const isConnected = await ensureWalletConnected();
      if (!isConnected) return;

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
          description: "This ticket is now available in your wallet again.",
        });

        cancelListing(ticket.id);

        await Promise.allSettled([
          invalidateTickets(walletAddress),
          refetchTickets({ throwOnError: false }),
        ]);
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
      ensureWalletConnected,
      cancelListing,
      invalidateTickets,
      publicClient,
      refetchTickets,
      walletAddress,
      walletClient,
    ]
  );

  // Sort tickets: owned first, then listed, date-valid before expired
  const sortedTickets = useMemo(() => {
    const hasEventPassed = (dateString: string): boolean => {
      const eventDate = new Date(dateString);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return eventDate < now;
    };

    return [...tickets].sort((a, b) => {
      if (a.status !== b.status) {
        const statusOrder = { owned: 0, listed: 1, sold: 2 } as const;
        return statusOrder[a.status] - statusOrder[b.status];
      }
      const aExpired = hasEventPassed(a.date);
      const bExpired = hasEventPassed(b.date);
      if (aExpired === bExpired) return 0;
      return aExpired ? 1 : -1;
    });
  }, [tickets]);

  // Show nothing while hydrating or if not authenticated after hydration
  if (!hasHydrated || (hasHydrated && !isAuthenticated)) return null;

  const handleFlip = (ticketId: string) => {
    // Find the ticket
    const ticket = tickets.find(t => t.id === ticketId);

    // Prevent flipping if ticket is listed (can't view QR code)
    if (ticket?.status === 'listed') {
      return;
    }

    setFlippedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  };

  // Check if event date has passed
  const hasEventPassed = (dateString: string): boolean => {
    const eventDate = new Date(dateString);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return eventDate < now;
  };

  const handleListForSale = (ticket: Ticket) => {
    if (!canListTicket(ticket)) {
      toast.warning('Cannot list ticket', {
        description: 'Event date has passed or ticket is invalid'
      });
      return;
    }
    if (!ticket.tokenId) {
      toast.error('Missing token information', {
        description: 'Unable to locate the on-chain token id for this ticket.',
      });
      return;
    }
    setListingTicket(ticket);
    setListingPrice("");
    setListingStage("idle");
  };

  const handleShareTicket = async (ticket: Ticket) => {
    if (ticket.eventId === undefined) {
      toast.error('Cannot share event', {
        description: 'Missing event identifier for this ticket.',
      });
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const configuredBase = process.env.NEXT_PUBLIC_URL;
    const runtimeOrigin = window.location.origin;
    const baseUrl =
      (configuredBase && configuredBase.length > 0 ? configuredBase : runtimeOrigin).replace(/\/$/, '');
    const eventUrl = `${baseUrl}/event/${ticket.eventId}`;
    const castText = `I just grabbed a ticket to ${ticket.eventTitle} on Base! Join me here: ${eventUrl}`;

    setSharingTicketId(ticket.id);

    try {
      const inMiniApp = await sdk.isInMiniApp();

      if (!inMiniApp) {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(eventUrl);
          } catch {
            // clipboard might be unavailable; fail silently
          }
        }
        toast.info('Open in Farcaster to share', {
          description: 'Share composer is only available inside the Farcaster app. The event link is copied.',
        });
        return;
      }

      const result = await sdk.actions.composeCast({
        text: castText,
        embeds: [eventUrl],
        channelKey: 'base',
      });

      if (result?.cast) {
        toast.success('Composer ready', {
          description: 'Finish the Base post to invite friends.',
        });
      } else {
        toast.info('Share canceled', {
          description: 'Cast composer was closed without posting.',
        });
      }
    } catch (error) {
      console.error('Failed to open Farcaster composer', error);
      toast.error('Share failed', {
        description:
          error instanceof Error ? error.message : 'Unexpected error while preparing the share.',
      });
    } finally {
      setSharingTicketId(null);
    }
  };

  if (!walletAddress || !isConnected) {
    return (
      <div className="relative min-h-screen flex flex-col bg-transparent overflow-hidden pb-24 md:pb-6">
        <BackgroundGradient />

        <TopBar title="My Tickets" showTitle={true} />

        <div className="relative z-10 flex-1 px-6 flex flex-col items-center justify-center text-center space-y-3 text-white/60">
          <p className="text-lg font-medium">Connect your wallet to see your tickets.</p>
          <p className="text-sm text-white/40">Use the button above or your browser wallet to continue.</p>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent overflow-hidden pb-24 md:pb-6">
      <BackgroundGradient />

      {/* Top Bar with Title */}
      <TopBar title="My Tickets" showTitle={true}/>

      {/* Desktop Navigation */}
      <DesktopNav />

      <div className="relative z-10 flex-1 px-6 pt-6">
        {isLoadingTickets ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <TicketCardSkeleton key={i} />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/40">
            <TicketIcon size={64} weight="thin" />
            <p className="mt-4 text-lg">No tickets yet</p>
            <p className="text-sm">Get tickets to upcoming events</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl">
            {sortedTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                isFlipped={flippedCards.has(ticket.id)}
                qrSize={qrSize}
                cancellingTicketId={cancellingTicketId}
                sharingTicketId={sharingTicketId}
                isListing={isListing}
                onFlip={handleFlip}
                onShare={(ticket) => void handleShareTicket(ticket)}
                onListForSale={handleListForSale}
                onCancelListing={(ticket) => void handleCancelListing(ticket)}
                hasEventPassed={hasEventPassed}
                canListTicket={canListTicket}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar - Mobile only */}
      <BottomNav />

      {/* Listing Modal */}
      {listingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                if (isListing) return;
                setListingTicket(null);
              }}
              disabled={isListing}
              className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors disabled:opacity-40"
            >
              ✕
            </button>

            {/* Content */}
            <div className="space-y-4">
              <h2 className="text-white text-2xl font-bold mb-4 flex items-center gap-2">
                <Tag size={28} weight="regular" />
                List Ticket for Sale
              </h2>
              
              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <h3 className="text-white font-semibold">{listingTicket.eventTitle}</h3>
                <p className="text-white/70 text-sm">{listingTicket.ticketType}</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="listing-price-input" className="text-white/70 text-sm">Set your price (ETH)</label>
                <input
                  id="listing-price-input"
                  type="number"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  placeholder="0.05"
                  step="0.0001"
                  min="0"
                  disabled={isListing}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-green-500/50 transition-colors disabled:opacity-50"
                />
                <p className="text-white/40 text-xs">
                  Settlement happens fully on-chain in ETH. Choose any sale price you&apos;d like.
                </p>
              </div>

              <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-3">
                <p className="text-blue-200 text-xs">
                  Your ticket will be temporarily unavailable while listed. You can cancel anytime before it&apos;s sold.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (isListing) return;
                    setListingTicket(null);
                  }}
                  disabled={isListing}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmListing}
                  disabled={isListing || !trimmedListingPrice}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isListing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {listingStage === "approving" && "Awaiting approval..."}
                      {listingStage === "listing" && "Preparing transaction..."}
                      {listingStage === "confirming" && "Waiting for confirmation..."}
                      {listingStage === "idle" && "Processing..."}
                    </span>
                  ) : (
                    "List Ticket"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
