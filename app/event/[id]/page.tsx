"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BackgroundGradient } from "@/components/layout/BackgroundGradient";
import { useRouter, useParams } from "next/navigation";
import { useAuthCheck } from "@/lib/store/authStore";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopNav } from "@/components/layout/DesktopNav";
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
import { base } from "wagmi/chains";
import { useEvent, useInvalidateEvents } from "@/lib/hooks/useEvents";
import { useFarcasterProfile } from "@/lib/hooks/useFarcasterProfile";
import { sdk } from "@farcaster/miniapp-sdk";
import { useEventAttendees } from "@/lib/hooks/useEventAttendees";
import { AttendeesList } from "@/components/event-view/AttendeesList";
import {
  EventHeader,
  EventDetailsTab,
  PurchaseModal,
} from "@/components/event-view";
import { parseEventMetadata } from "@/lib/utils/eventMetadata";

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
  categories: string[];
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
  const parsedMetadata = parseEventMetadata(raw.imageURI ?? null);
  const resolvedImageUri =
    parsedMetadata.imageUrl ??
    (raw.imageURI && raw.imageURI.trim().length > 0 ? raw.imageURI : null);
  const resolvedCategories =
    parsedMetadata.categories.length > 0
      ? parsedMetadata.categories
      : ["Event"];

  const eventDate = new Date(raw.date * 1000);
  const time = eventDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    id: raw.id,
    title: raw.name,
    description: "",
    longDescription: "",
    date: eventDate.toISOString(),
    time,
    location: raw.location,
    venue: raw.location,
    attendees: raw.ticketsSold,
    maxAttendees: raw.maxCapacity,
    categories: resolvedCategories,
    host: shortenAddress(raw.creator),
    hostAddress: raw.creator,
    priceWei: raw.price,
    priceEth: formatEther(BigInt(raw.price)),
    isPast: raw.isPast,
    isFull: raw.isFull,
    imageUri: resolvedImageUri,
  };
};

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const _formatCompactNumber = (value: number) =>
  compactNumberFormatter.format(value);

// Skeleton components for loading states
const EventHeaderSkeleton = () => (
  <div className="mb-8 sm:mb-10 animate-pulse">
    <div className="h-8 sm:h-10 bg-white/10 rounded-lg w-3/4 mb-4"></div>
    <div className="flex gap-2 mb-4">
      <div className="h-6 bg-white/10 rounded-full w-20"></div>
      <div className="h-6 bg-white/10 rounded-full w-24"></div>
    </div>
  </div>
);

const EventDetailsSkeleton = () => (
  <div className="space-y-6 mb-8 sm:mb-12 animate-pulse">
    <div className="space-y-3">
      <div className="h-4 bg-white/10 rounded w-1/4"></div>
      <div className="h-6 bg-white/10 rounded w-2/3"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-white/10 rounded w-1/4"></div>
      <div className="h-6 bg-white/10 rounded w-1/2"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-white/10 rounded w-1/4"></div>
      <div className="h-6 bg-white/10 rounded w-3/4"></div>
    </div>
  </div>
);

export default function EventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id ? Number.parseInt(params.id as string, 10) : null;

  const { isAuthenticated, hasHydrated } = useAuthCheck();
  const { invalidateTickets, invalidateDetail } = useInvalidateEvents();
  const clearDuplicates = useTicketStore((state) => state.clearDuplicates);
  const { address: walletAddress, isConnected } = useAccount();
  const { connect } = useConnect();
  const connectors = useConnectors();
  const publicClient = usePublicClient({ chainId: base.id });
  const { data: walletClient } = useWalletClient({ chainId: base.id });

  const { data: eventData, isLoading: isLoadingEvent, error: fetchError } = useEvent(eventId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseStage, setPurchaseStage] = useState<PurchaseStage>("idle");
  const [activeTab, setActiveTab] = useState<"details" | "attendees">("details");

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
      connect({ connector: injected, chainId: base.id });
    }
  }, [connect, connectors, hasHydrated, isAuthenticated, isConnected]);

  const isRegisterDisabled = useMemo(() => {
    if (!event) return true;
    if (event.isPast || event.isFull) return true;
    return false;
  }, [event]);

  const isEventOwner = useMemo(() => {
    if (!event || !walletAddress) return false;
    return event.hostAddress.toLowerCase() === walletAddress.toLowerCase();
  }, [event, walletAddress]);

  const attendeesQuery = useEventAttendees(isEventOwner ? eventId : null);
  const attendeesData = attendeesQuery.data ?? { attendees: [], count: 0 };

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

  // Only show full page loader during initial hydration
  if (!hasHydrated) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-transparent">
        <BackgroundGradient />
        <div className="relative z-10 text-white/40">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Show error state only after loading is complete and there's an actual error
  if (!isLoadingEvent && !event && fetchError) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-transparent overflow-hidden">
        <BackgroundGradient />
        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-bold text-white/30 mb-4">
            Event Not Found
          </h1>
          <p className="text-white/40 text-sm mb-4">
            {fetchError instanceof Error ? fetchError.message : "Failed to load event"}
          </p>
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

  const isUnavailableMessage = event?.isPast
    ? "This event has already taken place."
    : event?.isFull
    ? "This event is fully booked."
    : null;

  return (
    <div className="relative min-h-screen flex flex-col bg-transparent pb-[148px] sm:pb-24 md:pb-10">
      <BackgroundGradient />

      {/* Mobile Top Bar - Fixed */}
      <div className="md:hidden">
        <TopBar
          showBackButton={true}
          backPath="/home"
          backTitle="Back to Events"
          showScanner={isEventOwner}
          onScannerClick={handleScannerClick}
        />
      </div>

      {/* Desktop Navigation with integrated QR scanner and back button */}
      <DesktopNav
        variant="event-detail"
        showScanner={isEventOwner}
        onScannerClick={handleScannerClick}
        backPath="/home"
        backTitle="Back to Events"
      />

      <BottomNav />

      <div className="relative z-10 flex-1 pb-8 md:pb-12 max-w-4xl mx-auto w-full px-6 pt-20 sm:pt-20 md:pt-24">
        {/* Show skeleton or actual header */}
        {isLoadingEvent || !event ? (
          <EventHeaderSkeleton />
        ) : (
          <EventHeader
            title={event.title}
            categories={event.categories}
            isEventOwner={isEventOwner}
            activeTab={activeTab}
            attendeesCount={attendeesData.count}
            onTabChange={setActiveTab}
          />
        )}

        {/* Show skeleton or actual content based on tab */}
        {activeTab === "details" && (
          <>
            {isLoadingEvent || !event ? (
              <EventDetailsSkeleton />
            ) : (
              <EventDetailsTab
                event={event}
                farcasterProfile={farcasterProfile}
                isLoadingProfile={farcasterProfileQuery.isFetching}
                shouldShowProfile={shouldShowFarcasterProfile}
                onViewProfile={handleViewProfile}
              />
            )}
          </>
        )}

        {activeTab === "attendees" && isEventOwner && (
          <div className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-semibold text-white/90 mb-4 sm:mb-5">
              Event Attendees
            </h2>
            <AttendeesList
              attendees={attendeesData.attendees}
              isLoading={attendeesQuery.isLoading}
            />
          </div>
        )}

        {/* Show button with loading state or actual state */}
        <div className="fixed bottom-[112px] left-0 right-0 px-6 py-3 sm:static sm:px-0 sm:py-0 z-30 sm:z-auto">
          <div className="max-w-3xl mx-auto">
            {isLoadingEvent ? (
              <div className="w-full h-14 bg-white/10 rounded-xl animate-pulse"></div>
            ) : (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                disabled={isRegisterDisabled}
                className="w-full bg-white text-gray-950 font-semibold py-3.5 sm:py-4 px-6 rounded-xl transition-all hover:bg-white/90 active:scale-[0.98] disabled:bg-white/30 disabled:text-gray-600 disabled:cursor-not-allowed shadow-none"
              >
                {isUnavailableMessage ?? "Register for Event"}
              </button>
            )}
          </div>
        </div>
      </div>

      {event && (
        <PurchaseModal
          isOpen={isModalOpen}
          isPurchasing={isPurchasing}
          purchaseStage={purchaseStage}
          event={{
            id: event.id,
            title: event.title,
            priceEth: event.priceEth,
            attendees: event.attendees,
            maxAttendees: event.maxAttendees,
            host: event.host,
            location: event.location,
          }}
          contractAddress={EVENT_BOOK_ADDRESS}
          onClose={() => setIsModalOpen(false)}
          onPurchase={handlePurchase}
        />
      )}
    </div>
  );
}
