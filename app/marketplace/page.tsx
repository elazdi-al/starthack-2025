"use client";

import { BackgroundGradient } from "@/components/BackgroundGradient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarBlank, MapPin, Users, ArrowLeft, ShoppingCart } from "phosphor-react";
import { useAuthCheck } from "@/lib/store/authStore";
import { useTicketStore } from "@/lib/store/ticketStore";
import { pay, getPaymentStatus } from '@base-org/account';
import { WalletBalance } from "@/components/WalletBalance";
import { toast } from "sonner";

// Mock marketplace tickets - replace with actual data from backend
const marketplaceTickets = [
  {
    id: "MKT-001",
    eventId: 1, // Links to event ID for detail page
    eventTitle: "Web3 Developer Meetup",
    date: "2025-10-25",
    time: "18:00 - 21:00",
    location: "San Francisco, CA",
    venue: "TechHub SF, 505 Howard St",
    ticketType: "General Admission",
    price: "25.00", // USD
    seller: "0x1234...5678",
    availableQuantity: 3
  },
  {
    id: "MKT-002",
    eventId: 2,
    eventTitle: "Blockchain Workshop",
    date: "2025-11-02",
    time: "14:00 - 17:00",
    location: "New York, NY",
    venue: "Innovation Lab, 123 Broadway",
    ticketType: "VIP Access",
    price: "150.00",
    seller: "0xabcd...efgh",
    availableQuantity: 1
  },
  {
    id: "MKT-003",
    eventId: 3,
    eventTitle: "NFT Art Exhibition",
    date: "2025-11-10",
    time: "10:00 - 18:00",
    location: "Los Angeles, CA",
    venue: "Digital Gallery, 456 Arts District",
    ticketType: "General Admission",
    price: "40.00",
    seller: "0x9876...4321",
    availableQuantity: 5
  },
  {
    id: "MKT-004",
    eventId: 4,
    eventTitle: "DeFi Summit 2025",
    date: "2025-11-18",
    time: "09:00 - 18:00",
    location: "Austin, TX",
    venue: "Convention Center",
    ticketType: "Early Bird",
    price: "99.00",
    seller: "0xfedc...ba98",
    availableQuantity: 10
  }
];

interface PurchaseModalProps {
  ticket: typeof marketplaceTickets[0] | null;
  onClose: () => void;
  onPurchase: (ticketId: string, userInfo: any) => void;
  isPurchasing: boolean;
}

function PurchaseModal({ ticket, onClose, onPurchase, isPurchasing }: PurchaseModalProps) {
  if (!ticket) return null;

  const handlePurchase = () => {
    onPurchase(ticket.id, {});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        {/* Close button */}
        <button
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
            <h3 className="text-white font-semibold text-lg">{ticket.eventTitle}</h3>
            
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <CalendarBlank size={16} weight="regular" />
              <span>{new Date(ticket.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>

            <div className="flex items-center gap-2 text-white/70 text-sm">
              <MapPin size={16} weight="regular" />
              <span>{ticket.venue}</span>
            </div>

            <div className="pt-3 border-t border-white/10">
              <p className="text-white/50 text-sm">Ticket Type</p>
              <p className="text-white font-medium">{ticket.ticketType}</p>
            </div>

            <div className="pt-3 border-t border-white/10">
              <p className="text-white/50 text-sm">Price</p>
              <p className="text-white text-3xl font-bold">${ticket.price} <span className="text-lg text-white/50">USDC</span></p>
            </div>
          </div>

          <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-3">
            <p className="text-blue-200 text-xs">
              You'll be prompted to provide your email address and optionally your phone number for ticket delivery.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors"
              disabled={isPurchasing}
            >
              Cancel
            </button>
            <button
              onClick={handlePurchase}
              disabled={isPurchasing}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPurchasing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart size={20} weight="regular" />
                  Pay with Base
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
  const { tickets, cancelListing } = useTicketStore();
  const [selectedTicket, setSelectedTicket] = useState<typeof marketplaceTickets[0] | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Get user's listed tickets
  const userListedTickets = tickets.filter(t => t.status === 'listed');

  // Redirect to login if not authenticated (only after hydration)
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push('/');
    }
  }, [hasHydrated, isAuthenticated, router]);

  const handleBack = () => {
    router.push('/home');
  };

  const handlePurchase = async (ticketId: string, userInfo: any) => {
    const ticket = marketplaceTickets.find(t => t.id === ticketId);
    if (!ticket) return;

    setIsPurchasing(true);

    try {
      // Initiate Base Pay payment
      const payment = await pay({
        amount: ticket.price,
        to: ticket.seller as `0x${string}`, // Seller's address
        testnet: true, // Set to false for mainnet
        payerInfo: {
          requests: [
            { type: 'email' },
            { type: 'phoneNumber', optional: true }
          ]
        }
      });

      console.log(`Payment initiated! Transaction ID: ${payment.id}`);

      // Log collected user information
      if (payment.payerInfoResponses) {
        if (payment.payerInfoResponses.email) {
          console.log(`Email: ${payment.payerInfoResponses.email}`);
        }
        if (payment.payerInfoResponses.phoneNumber) {
          console.log(`Phone: ${payment.payerInfoResponses.phoneNumber.number}`);
        }
      }

      // Poll for payment status
      const checkStatus = async () => {
        try {
          const { status } = await getPaymentStatus({
            id: payment.id,
            testnet: true // Must match the testnet setting
          });

          if (status === 'completed') {
            toast.success('Purchase Successful!', {
              description: 'Ticket sent to your email'
            });
            setSelectedTicket(null);

            // TODO: Send ticket to user's email
            // TODO: Add ticket to user's account via backend API
          } else if (status === 'pending') {
            // Keep polling
            setTimeout(checkStatus, 2000);
          } else {
            toast.error('Payment failed', {
              description: 'Payment was cancelled or failed to complete'
            });
          }
        } catch (error) {
          toast.error('Payment status error', {
            description: error instanceof Error ? error.message : 'Failed to check payment status'
          });
        } finally {
          setIsPurchasing(false);
        }
      };

      // Start polling
      setTimeout(checkStatus, 2000);

    } catch (error: any) {
      toast.error('Payment failed', {
        description: error.message || 'An error occurred during payment'
      });
      setIsPurchasing(false);
    }
  };

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
    <div className="relative min-h-screen flex flex-col p-6 bg-transparent overflow-hidden">
      <BackgroundGradient />

      {/* Back button */}
      <button
        className="absolute top-6 left-6 z-20 text-white/40 hover:text-white/80 transition-colors flex items-center gap-2"
        type="button"
        onClick={handleBack}
        title="Back to Home"
      >
        <ArrowLeft size={24} weight="regular" />
        <span className="text-sm">Back</span>
      </button>

      {/* Wallet Balance - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <WalletBalance />
      </div>

      {/* Header */}
      <div className="relative z-10 pt-8 pb-6">
        <h1 className="text-6xl tracking-tighter font-bold text-white/30 mb-2">
          Ticket Marketplace
        </h1>
        <p className="text-sm text-white/50">
          Buy tickets from other users • Pay with Base Pay
        </p>
      </div>

      {/* User's Listed Tickets Section */}
      {userListedTickets.length > 0 && (
        <div className="relative z-10 mb-8 max-w-7xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white/70">Your Listings</h2>
            <span className="text-white/50 text-sm">{userListedTickets.length} active</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userListedTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-blue-500/10 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 shadow-xl cursor-pointer hover:bg-blue-500/20 transition-all"
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
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click from firing
                    cancelListing(ticket.id);
                  }}
                  className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold py-2 rounded-xl transition-colors"
                >
                  Cancel Listing
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Marketplace Cards */}
      <div className="relative z-10 flex-1 pb-8">
        <h2 className="text-2xl font-bold text-white/70 mb-4">Available Tickets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl">
          {marketplaceTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all shadow-xl flex flex-col cursor-pointer"
              onClick={() => router.push(`/event/${ticket.eventId}`)}
            >
              {/* Price Badge */}
              <div className="flex justify-between items-start mb-4">
                <div className="bg-green-500/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <p className="text-green-400 text-sm font-bold">${ticket.price}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                  <p className="text-white/70 text-xs">{ticket.availableQuantity} left</p>
                </div>
              </div>

              {/* Event title */}
              <h3 className="text-white font-bold text-xl mb-4 line-clamp-2">
                {ticket.eventTitle}
              </h3>

              {/* Details */}
              <div className="space-y-3 flex-1">
                <div className="flex items-start gap-3">
                  <CalendarBlank size={20} weight="regular" className="text-white/60 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white/90 text-sm">
                      {new Date(ticket.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin size={20} weight="regular" className="text-white/60 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white/90 text-sm">{ticket.venue}</p>
                    <p className="text-white/60 text-xs">{ticket.location}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users size={20} weight="regular" className="text-white/60 mt-0.5 flex-shrink-0" />
                  <p className="text-white/90 text-sm">{ticket.ticketType}</p>
                </div>
              </div>

              {/* Seller info */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-white/40 text-xs mb-2">Seller</p>
                <p className="text-white/70 text-sm font-mono">{ticket.seller}</p>
              </div>

              {/* Buy button */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click from firing
                  setSelectedTicket(ticket);
                }}
                className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart size={20} weight="regular" />
                Buy Ticket
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase Modal */}
      {selectedTicket && (
        <PurchaseModal
          ticket={selectedTicket}
          onClose={() => !isPurchasing && setSelectedTicket(null)}
          onPurchase={handlePurchase}
          isPurchasing={isPurchasing}
        />
      )}
    </div>
  );
}

