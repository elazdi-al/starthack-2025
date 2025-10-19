"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { useRouter } from "next/navigation";
import { CalendarBlank, MapPin, Users, QrCode } from "phosphor-react";
import { useAuthCheck } from "@/lib/store/authStore";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { ticketsAPI } from "@/lib/api";
import { EVENT_BOOK_ABI, EVENT_BOOK_ADDRESS } from "@/lib/contracts/eventBook";
import { formatEther } from "viem";
import { toast } from "sonner";
import { useTicketStore } from "@/lib/store/ticketStore";
import {
  useAccount,
  useConnect,
  useConnectors,
  usePublicClient,
  useWalletClient,
} from "wagmi";
import { useEvent, useInvalidateEvents } from "@/lib/hooks/useEvents";
import Image from "next/image";
import { useFarcasterProfile } from "@/lib/hooks/useFarcasterProfile";
import { sdk } from "@farcaster/miniapp-sdk";

interface EventDetails {
  id: number;
  title: string;
  description: string;
  longDescription: string;
  date: string;
  time: string;
  location: string;
  venue: string;
  attendees: number;
  maxAttendees: number;
  category: string;
  host: string;
  hostAddress: string;
  priceWei: string;
  priceEth: string;
  isPast: boolean;
  isFull: boolean;
  imageUri: string | null;
}

type PurchaseStage =
  | "idle"
  | "validating"
  | "minting"
  | "confirming";

const shortenAddress = (address: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Unknown";

const buildFallbackDescription = (event: {
  name: string;
  location: string;
  date: number;
  price: string;
  creator: string;
}) => {
  const eventDate = new Date(event.date * 1000);
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const priceEth = Number(formatEther(BigInt(event.price)));

  return `On-chain event hosted by ${shortenAddress(
    event.creator
  )} at ${event.location} on ${formattedDate}. Tickets cost ${
    priceEth > 0 ? `${priceEth} ETH` : "free"
  } and are settled directly on Base.`;
};

const transformEvent = (raw: {
  id: number;
  name: string;
  location: string;
  date: number;
  price: string;
  creator: string;
  ticketsSold: number;
  maxCapacity: number;
  isPast: boolean;
  isFull: boolean;
  imageURI?: string | null;
}): EventDetails => {
  const eventDate = new Date(raw.date * 1000);
  const time = eventDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const description = buildFallbackDescription(raw);

  return {
    id: raw.id,
    title: raw.name,
    description,
    longDescription: `${description} This ticket is minted on-chain and can be resold in the marketplace.`,
    date: eventDate.toISOString(),
    time,
    location: raw.location,
    venue: raw.location,
    attendees: raw.ticketsSold,
    maxAttendees: raw.maxCapacity,
    category: "Blockchain Event",
    host: shortenAddress(raw.creator),
    hostAddress: raw.creator,
    priceWei: raw.price,
    priceEth: formatEther(BigInt(raw.price)),
    isPast: raw.isPast,
    isFull: raw.isFull,
    imageUri: raw.imageURI && raw.imageURI.trim().length > 0 ? raw.imageURI : null,
  };
};

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const formatCompactNumber = (value: number) =>
  compactNumberFormatter.format(value);

interface EventPageClientProps {
  eventId: number | null;
}

export default function EventPageClient({ eventId }: EventPageClientProps) {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthCheck();
  const { invalidateTickets, invalidateDetail } = useInvalidateEvents();
  const clearDuplicates = useTicketStore((state) => state.clearDuplicates);
  const { address: walletAddress, isConnected } = useAccount();
  const { connect } = useConnect();
  const connectors = useConnectors();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Use TanStack Query for event data
  const { data: eventData, isLoading: isLoadingEvent, error: fetchError } = useEvent(eventId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseStage, setPurchaseStage] = useState<PurchaseStage>("idle");

  // Transform the event data from the query
  const event = useMemo(() => {
    if (!eventData?.event) return null;
    return transformEvent(eventData.event);
  }, [eventData]);

  const farcasterProfileQuery = useFarcasterProfile(event?.hostAddress);
  const farcasterProfile = farcasterProfileQuery.data ?? null;  
  const farcasterFid = farcasterProfile?.fid ?? null;
  const shouldShowFarcasterProfile =
    !!event &&
    (farcasterProfileQuery.isFetching || farcasterProfileQuery.isFetched);

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
      connect({ connector: injected });
    }
  }, [connect, connectors, hasHydrated, isAuthenticated, isConnected]);

  const isRegisterDisabled = useMemo(() => {
    if (!event) return true;
    if (event.isPast || event.isFull) return true;
    return false;
  }, [event]);

  // Check if current user is the event owner
  const isEventOwner = useMemo(() => {
    if (!event || !walletAddress) return false;
    return event.hostAddress.toLowerCase() === walletAddress.toLowerCase();
  }, [event, walletAddress]);

  const handleScannerClick = useCallback(() => {
    if (event) {
      router.push(`/scanner?eventId=${event.id}`);
    } else {
      router.push('/scanner');
    }
  }, [router, event]);

  const handleViewProfile = useCallback(async () => {
    if (!farcasterFid) {
      toast.info("Profile unavailable", {
        description: "This host has not linked a Farcaster account yet.",
      });
      return;
    }

    try {
      const inMiniApp = await sdk.isInMiniApp();

      if (!inMiniApp) {
        toast.info("Open in Farcaster", {
          description: "Profile viewing is available from inside the Farcaster app.",
        });
        return;
      }

      if (typeof sdk.actions?.viewProfile !== "function") {
        toast.error("Unsupported action", {
          description: "This Farcaster client does not support opening profiles.",
        });
        return;
      }

      await sdk.actions.viewProfile({ fid: farcasterFid });
    } catch (error) {
      console.error("Failed to open Farcaster profile", error);
      toast.error("Unable to open profile", {
        description:
          error instanceof Error ? error.message : "Unexpected error while opening the Farcaster profile.",
      });
    }
  }, [farcasterFid]);

  const handlePurchase = useCallback(async () => {
    if (!event) {
      toast.error("Event unavailable", {
        description: "Unable to locate this event on-chain.",
      });
      return;
    }

    const accountAddress = walletAddress ?? null;

    if (!accountAddress) {
      toast.error("Wallet required", {
        description: "Please connect your wallet to register for this event.",
      });
      return;
    }

    try {
      setIsPurchasing(true);
      setPurchaseStage("validating");

      await ticketsAPI.validatePurchase(event.id, accountAddress);

      if (!walletClient) {
        throw new Error("Wallet client unavailable. Please reconnect your wallet.");
      }

      if (!publicClient) {
        throw new Error("Public client unavailable. Please try again.");
      }

      setPurchaseStage("minting");

      const value = BigInt(event.priceWei);
      const { request } = await publicClient.simulateContract({
        account: accountAddress as `0x${string}`,
        address: EVENT_BOOK_ADDRESS,
        abi: EVENT_BOOK_ABI,
        functionName: "buyTicket",
        args: [BigInt(event.id)],
        value,
      });

      const hash = await walletClient.writeContract(request);

      setPurchaseStage("confirming");

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status !== "success") {
        throw new Error("Transaction failed or reverted.");
      }

      // Invalidate cache to refetch latest data
      await Promise.all([
        eventId !== null ? invalidateDetail(eventId) : Promise.resolve(),
        accountAddress ? invalidateTickets(accountAddress) : Promise.resolve(),
      ]);
      clearDuplicates();

      toast.success("Ticket purchased!", {
        description: "You can view this ticket in the My Tickets tab.",
      });

      setIsModalOpen(false);
    } catch (error) {
      toast.error("Unable to complete purchase", {
        description:
          error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsPurchasing(false);
      setPurchaseStage("idle");
    }
  }, [
    event,
    walletAddress,
    walletClient,
    eventId,
    invalidateDetail,
    invalidateTickets,
    publicClient,
    clearDuplicates,
  ]);

  const renderLoader = () => (
    <div className="relative min-h-screen flex items-center justify-center bg-transparent">
      <BackgroundGradient />
      <div className="relative z-10 text-white/40">Loading...</div>
    </div>
  );

  if (!hasHydrated || isLoadingEvent) {
    return renderLoader();
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!event) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-transparent overflow-hidden">
        <BackgroundGradient />
        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-bold text-white/30 mb-4">
            Event Not Found
          </h1>
          {fetchError && (
            <p className="text-white/40 text-sm mb-4">
              {fetchError instanceof Error ? fetchError.message : "Failed to load event"}
            </p>
          )}
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="text-white/60 hover:text-white/80 transition-colors"
          >
            Return to Events
          </button>
        </div>
      </div>
    );
  }

  const isUnavailableMessage = event.isPast
    ? "This event has already taken place."
    : event.isFull
    ? "This event is fully booked."
    : null;

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent overflow-hidden pb-[148px] sm:pb-24 md:pb-10">
      <BackgroundGradient />

      <TopBar
        showBackButton={true}
        backPath="/home"
        backTitle="Back to Events"
      />

      {/* Scanner button - only for event owners */}
      {isEventOwner && (
        <button
          type="button"
          onClick={handleScannerClick}
          className="fixed top-4 right-4 z-20 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-3 transition-all active:scale-95"
          title="Scan QR Code"
        >
          <QrCode size={24} weight="regular" className="text-white/80" />
        </button>
      )}

      <BottomNav />

      <div className="relative z-10 flex-1 pb-8 md:pb-8 max-w-3xl mx-auto w-full px-6 pt-16 sm:pt-20">
        <div className="mb-3 sm:mb-4">
          <span className="text-xs sm:text-sm px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50">
            {event.category}
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl tracking-tighter font-bold text-white mb-6 sm:mb-8">
          {event.title}
        </h1>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 mb-8 sm:mb-12">
          <div className="relative w-full lg:w-[45%] aspect-[4/3] rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
            {event.imageUri ? (
              <Image
                src={event.imageUri}
                alt={`${event.title} cover art`}
                fill
                unoptimized
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-white/10 via-white/5 to-transparent">
                <span className="text-white/50 text-sm">No cover image</span>
                <span className="text-white/30 text-xs">Add one during event creation</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4 sm:space-y-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <CalendarBlank
                  size={20}
                  weight="regular"
                  className="text-white/40 mt-0.5 shrink-0"
                />
                <div>
                  <p className="text-white text-base sm:text-lg">
                    {new Date(event.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-white/50 text-sm sm:text-base mt-0.5">
                    {event.time}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <MapPin
                  size={20}
                  weight="regular"
                  className="text-white/40 mt-0.5 shrink-0"
                />
                <div>
                  <p className="text-white text-base sm:text-lg">{event.venue}</p>
                  <p className="text-white/50 text-sm sm:text-base mt-0.5">
                    {event.location}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <Users
                  size={20}
                  weight="regular"
                  className="text-white/40 mt-0.5 shrink-0"
                />
                <div>
                  <p className="text-white text-base sm:text-lg">
                    {event.attendees} attending
                  </p>
                  <p className="text-white/50 text-sm sm:text-base mt-0.5">
                    Hosted by {event.host}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-4 sm:p-5">
                <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-1">
                  Price
                </p>
                <p className="text-white text-2xl font-semibold">
                  {Number(event.priceEth) > 0
                    ? `${Number(event.priceEth).toFixed(4)} ETH`
                    : "Free"}
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-4 sm:p-5">
                <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-1">
                  Capacity
                </p>
                <p className="text-white text-2xl font-semibold">
                  {event.maxAttendees > 0
                    ? `${event.attendees}/${event.maxAttendees}`
                    : `${event.attendees} attending`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-semibold text-white/90 mb-4 sm:mb-5">
            About
          </h2>
          <p className="text-base sm:text-lg text-white/60 leading-relaxed">
            {event.longDescription}
          </p>
        </div>

        {shouldShowFarcasterProfile && (
          <div className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-semibold text-white/90 mb-4 sm:mb-5">
              Host on Farcaster
            </h2>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6">
              {farcasterProfileQuery.isFetching && !farcasterProfile ? (
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-white/10 rounded animate-pulse" />
                  </div>
                </div>
              ) : farcasterProfile ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-white/10 bg-white/10 shrink-0">
                    {farcasterProfile.pfp_url ? (
                      <Image
                        src={farcasterProfile.pfp_url}
                        alt={`${
                          farcasterProfile.display_name ??
                          farcasterProfile.username ??
                          "Farcaster user"
                        } profile`}
                        fill
                        unoptimized
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/60 text-xl uppercase">
                        {farcasterProfile.display_name?.[0] ??
                          farcasterProfile.username?.[0] ??
                          "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-white text-lg sm:text-xl font-semibold">
                        {farcasterProfile.display_name ??
                          farcasterProfile.username ??
                          `Farcaster #${farcasterProfile.fid}`}
                      </p>
                      {farcasterProfile.username && (
                        <p className="text-white/60 text-sm">
                          @{farcasterProfile.username}
                        </p>
                      )}
                    </div>
                    {farcasterProfile.profile?.bio?.text && (
                      <p className="text-white/60 text-sm leading-relaxed">
                        {farcasterProfile.profile.bio.text}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-white/50 text-xs sm:text-sm">
                      {typeof farcasterProfile.follower_count === "number" && (
                        <span>
                          {formatCompactNumber(
                            farcasterProfile.follower_count,
                          )}{" "}
                          followers
                        </span>
                      )}
                      {typeof farcasterProfile.following_count === "number" && (
                        <span>
                          Following{" "}
                          {formatCompactNumber(
                            farcasterProfile.following_count,
                          )}
                        </span>
                      )}
                      <span>FID {farcasterProfile.fid}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleViewProfile}
                    className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-xl transition-colors"
                  >
                    View Profile
                  </button>
                </div>
              ) : (
                <div className="text-white/60 text-sm">
                  This host has not linked a Farcaster profile yet. {farcasterProfileQuery.data?.toString() ?? "null"}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="fixed bottom-[112px] left-0 right-0 px-6 py-3 sm:static sm:px-0 sm:py-0 z-30 sm:z-auto">
          <div className="max-w-3xl mx-auto">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={isRegisterDisabled}
              className="w-full bg-white text-gray-950 font-semibold py-3.5 sm:py-4 px-6 rounded-xl transition-all hover:bg-white/90 active:scale-[0.98] disabled:bg-white/30 disabled:text-gray-600 disabled:cursor-not-allowed shadow-none"
            >
              {isUnavailableMessage ?? "Register for Event"}
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            aria-label="Close modal"
            onClick={() => !isPurchasing && setIsModalOpen(false)}
            disabled={isPurchasing}
          />
          <div className="relative w-full max-w-[95vw] sm:max-w-lg md:max-w-xl bg-white/10 border border-white/20 rounded-3xl p-5 sm:p-6 md:p-8 backdrop-blur-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
            <button
              type="button"
              className="absolute top-4 right-4 text-white/50 hover:text-white/80 transition-colors"
              onClick={() => setIsModalOpen(false)}
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
                  <span className="font-mono">
                    {shortenAddress(EVENT_BOOK_ADDRESS)}
                  </span>
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
                  <p className="text-white text-lg font-medium">
                    {event.host}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
                  <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-1">
                    Location
                  </p>
                  <p className="text-white text-lg font-medium">
                    {event.location}
                  </p>
                </div>
              </div>

              <div className="bg-blue-500/15 border border-blue-500/30 rounded-2xl p-3 sm:p-4">
                <p className="text-blue-100 text-sm">
                  Ticket settlement happens fully on-chain via the EventBook
                  contract. After the transaction confirms, your NFT ticket will
                  appear in the My Tickets tab and can be managed from your
                  wallet.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPurchasing}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 sm:py-3.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePurchase}
                  disabled={isPurchasing}
                  className="flex-1 bg-white text-gray-950 font-semibold py-3.5 sm:py-4 px-6 rounded-xl transition-all hover:bg-white/90 active:scale-[0.98] disabled:bg-white/30 disabled:text-gray-600 disabled:cursor-not-allowed shadow-none flex items-center justify-center gap-2"
                >
                  {isPurchasing ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {purchaseStage === "validating" && "Validating..."}
                      {purchaseStage === "minting" && "Submitting on-chain..."}
                      {purchaseStage === "confirming" && "Waiting for confirmation..."}
                      {purchaseStage === "idle" && "Processing..."}
                    </>
                  ) : (
                    Number(event.priceEth) > 0 ? "Purchase Ticket" : "Mint Ticket"
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
