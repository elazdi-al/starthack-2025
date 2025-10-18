"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { useRouter } from "next/navigation";
import { CalendarBlank, MapPin, Users } from "phosphor-react";
import { useAuthCheck } from "@/lib/store/authStore";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { ticketsAPI } from "@/lib/api";
import { EVENT_BOOK_ADDRESS } from "@/lib/contracts/eventBook";
import { formatEther } from "viem";
import { toast } from "sonner";
import { pay, getPaymentStatus } from "@base-org/account";
import { useTicketStore } from "@/lib/store/ticketStore";
import { useAccount, useConnect, useConnectors } from "wagmi";
import { useEvent, useInvalidateEvents } from "@/lib/hooks/useEvents";

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
}

type PurchaseStage =
  | "idle"
  | "validating"
  | "paying"
  | "confirming"
  | "recording";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  } and are settled via Base Pay.`;
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
  };
};

interface EventPageClientProps {
  eventId: number | null;
}

export default function EventPageClient({ eventId }: EventPageClientProps) {
  const router = useRouter();
  const { isAuthenticated, hasHydrated, address } = useAuthCheck();
  const { addTicket } = useTicketStore();
  const { address: walletAddress, isConnected } = useAccount();
  const { connect } = useConnect();
  const connectors = useConnectors();
  const { invalidateDetail, invalidateTickets } = useInvalidateEvents();

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
      connect({ connector: injected }).catch((error) => {
        console.warn("Auto-connect failed:", error);
      });
    }
  }, [connect, connectors, hasHydrated, isAuthenticated, isConnected]);

  const isRegisterDisabled = useMemo(() => {
    if (!event) return true;
    if (event.isPast || event.isFull) return true;
    return false;
  }, [event]);

  const handlePurchase = useCallback(async () => {
    if (!event) {
      toast.error("Event unavailable", {
        description: "Unable to locate this event on-chain.",
      });
      return;
    }

    const accountAddress = walletAddress ?? address ?? null;

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

      let paymentId: string | null = null;

      if (Number(event.priceEth) > 0) {
        setPurchaseStage("paying");

        const payment = await pay({
          amount: Number(event.priceEth).toFixed(6),
          to: event.hostAddress as `0x${string}`,
          testnet: true,
          payerInfo: {
            requests: [
              { type: "email" as const },
              { type: "phoneNumber" as const, optional: true },
            ],
          },
        });

        paymentId = payment.id;

        setPurchaseStage("confirming");

        let completed = false;
        for (let attempt = 0; attempt < 10; attempt += 1) {
          const { status } = await getPaymentStatus({
            id: paymentId,
            testnet: true,
          });

          if (status === "completed") {
            completed = true;
            break;
          }

          if (status !== "pending") {
            throw new Error("Payment was cancelled or failed.");
          }

          await delay(2000);
        }

        if (!completed) {
          throw new Error("Payment confirmation timed out.");
        }
      }

      setPurchaseStage("recording");

      const response = await fetch("/api/tickets/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: event.id,
          address: accountAddress,
          paymentId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to record ticket purchase.");
      }

      addTicket(result.ticket);

      // Invalidate cache to refetch latest data
      if (eventId !== null) {
        invalidateDetail(eventId);
      }
      if (accountAddress) {
        invalidateTickets(accountAddress);
      }

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
  }, [event, walletAddress, address, addTicket]);

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

        <div className="space-y-4 sm:space-y-5 mb-8 sm:mb-12">
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

        <div className="w-full h-px bg-white/10 mb-8 sm:mb-12" />

        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-semibold text-white/90 mb-4 sm:mb-5">
            About
          </h2>
          <p className="text-base sm:text-lg text-white/60 leading-relaxed">
            {event.longDescription}
          </p>
        </div>

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
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            aria-hidden="true"
            onClick={() => !isPurchasing && setIsModalOpen(false)}
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
                  Ticket settlement is processed with Base Pay. After payment,
                  your NFT ticket will appear in the My Tickets tab and can be
                  managed from your wallet.
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
                      {purchaseStage === "paying" && "Paying with Base..."}
                      {purchaseStage === "confirming" && "Waiting for confirmation..."}
                      {purchaseStage === "recording" && "Recording ticket..."}
                      {purchaseStage === "idle" && "Processing..."}
                    </>
                  ) : (
                    "Pay with Base"
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
