"use client";

import { BackgroundGradient } from "@/components/BackgroundGradient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarBlank, MapPin, Clock, Ticket as TicketIcon, ArrowLeft, Wallet, CurrencyDollar, Tag } from "phosphor-react";
import { useAuthCheck } from "@/lib/store/authStore";
import { useTicketStore, type Ticket } from "@/lib/store/ticketStore";
import { QRCodeSVG } from "qrcode.react";
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';

// Initialize mock tickets if store is empty
const initializeMockTickets = (addTicket: any) => {
  const mockTickets: Ticket[] = [
    {
      id: "TKT-001",
      eventId: 1,
      eventTitle: "Web3 Developer Meetup",
      date: "2025-10-25",
      time: "18:00 - 21:00",
      location: "San Francisco, CA",
      venue: "TechHub SF, 505 Howard St",
      ticketType: "General Admission",
      purchaseDate: "2025-10-15",
      qrData: "TKT-001-WEB3-DEV-MEETUP-2025",
      isValid: true,
      status: 'owned'
    },
    {
      id: "TKT-002",
      eventId: 2,
      eventTitle: "Blockchain Workshop",
      date: "2025-11-02",
      time: "14:00 - 17:00",
      location: "New York, NY",
      venue: "Innovation Lab, 123 Broadway",
      ticketType: "VIP Access",
      purchaseDate: "2025-10-18",
      qrData: "TKT-002-BLOCKCHAIN-WORKSHOP-2025",
      isValid: true,
      status: 'owned'
    },
    {
      id: "TKT-003",
      eventId: 3,
      eventTitle: "NFT Art Exhibition",
      date: "2025-09-10",
      time: "10:00 - 18:00",
      location: "Los Angeles, CA",
      venue: "Digital Gallery, 456 Arts District",
      ticketType: "General Admission",
      purchaseDate: "2025-08-20",
      qrData: "TKT-003-NFT-ART-EXHIBITION-2025",
      isValid: false,
      status: 'owned'
    }
  ];
  
  mockTickets.forEach(ticket => addTicket(ticket));
};

export default function MyTickets() {
  const router = useRouter();
  const { isAuthenticated, address, hasHydrated } = useAuthCheck();
  const { tickets, addTicket, listTicket, cancelListing, getOwnedTickets, clearDuplicates } = useTicketStore();
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [qrSize, setQrSize] = useState(200);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [listingTicket, setListingTicket] = useState<Ticket | null>(null);
  const [listingPrice, setListingPrice] = useState("");
  const [initialized, setInitialized] = useState(false);
  
  // Clear duplicates on mount
  useEffect(() => {
    clearDuplicates();
  }, [clearDuplicates]);
  
  // Initialize mock tickets on first load only
  useEffect(() => {
    if (!initialized && tickets.length === 0) {
      initializeMockTickets(addTicket);
      setInitialized(true);
    }
  }, [initialized, tickets.length, addTicket]);

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

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!address) return;

      try {
        setIsLoadingBalance(true);
        const client = createPublicClient({
          chain: base,
          transport: http(),
        });

        const balanceInWei = await client.getBalance({
          address: address as `0x${string}`,
        });

        const balanceInEth = formatEther(balanceInWei);
        setBalance(balanceInEth);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance('0');
      } finally {
        setIsLoadingBalance(false);
      }
    };

    if (isAuthenticated && address) {
      fetchBalance();
    }
  }, [address, isAuthenticated]);

  // Redirect to login if not authenticated (only after hydration)
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push('/');
    }
  }, [hasHydrated, isAuthenticated, router]);

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

  const handleBack = () => {
    router.push('/home');
  };

  // Check if event date has passed
  const hasEventPassed = (dateString: string): boolean => {
    const eventDate = new Date(dateString);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return eventDate < now;
  };

  // Check if a ticket can be listed (date hasn't passed)
  const canListTicket = (ticket: Ticket): boolean => {
    const eventDate = new Date(ticket.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time for fair comparison
    const dateValid = eventDate >= now;
    return dateValid && ticket.status === 'owned';
  };

  const handleListForSale = (ticket: Ticket) => {
    if (!canListTicket(ticket)) {
      alert('Cannot list this ticket: Event date has passed or ticket is invalid');
      return;
    }
    setListingTicket(ticket);
    setListingPrice("");
  };

  const confirmListing = () => {
    if (listingTicket && listingPrice && parseFloat(listingPrice) > 0) {
      listTicket(listingTicket.id, listingPrice);
      setListingTicket(null);
      setListingPrice("");
    }
  };

  const handleCancelListing = (ticketId: string) => {
    cancelListing(ticketId);
  };

  // Sort tickets: owned first, then listed, date-valid before expired
  const sortedTickets = [...tickets].sort((a, b) => {
    // First sort by status (owned before listed before sold)
    if (a.status !== b.status) {
      const statusOrder = { owned: 0, listed: 1, sold: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    }
    // Then by validity (date-based)
    const aExpired = hasEventPassed(a.date);
    const bExpired = hasEventPassed(b.date);
    if (aExpired === bExpired) return 0;
    return aExpired ? 1 : -1; // Non-expired tickets first
  });

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
        title="Back to Events"
      >
        <ArrowLeft size={24} weight="regular" />
        <span className="text-sm">Back</span>
      </button>

      {/* Wallet Balance - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-2">
          <Wallet size={18} weight="regular" className="text-white/70" />
          {isLoadingBalance ? (
            <div className="w-16 h-4 bg-white/10 animate-pulse rounded"></div>
          ) : (
            <span className="text-white/90 text-sm font-medium">
              {balance ? parseFloat(balance).toFixed(4) : '0.0000'} <span className="text-white/50">ETH</span>
            </span>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 pt-8 pb-6">
        <h1 className="text-6xl tracking-tighter font-bold text-white/30 mb-2">
          My Tickets
        </h1>
        <p className="text-sm text-white/50">
          {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} • Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
        </p>
      </div>

      {/* Tickets grid */}
      <div className="relative z-10 flex-1 pb-8">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/40">
            <TicketIcon size={64} weight="thin" />
            <p className="mt-4 text-lg">No tickets yet</p>
            <p className="text-sm">Get tickets to upcoming events</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl">
            {sortedTickets.map((ticket) => {
              const isFlipped = flippedCards.has(ticket.id);
              return (
                    <div
                      key={ticket.id}
                      className={`relative h-[420px] perspective-1000 ${
                        ticket.status === 'listed' ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      onClick={() => handleFlip(ticket.id)}
                    >
                  {/* Flip container */}
                  <div
                    className={`relative w-full h-full transition-all duration-700 transform-style-3d ${
                      isFlipped ? 'rotate-y-180' : ''
                    }`}
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                  >
                    {/* Front of card - Ticket details */}
                    <div
                      className="absolute w-full h-full backface-hidden"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <div className="h-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col hover:bg-white/10 transition-all shadow-xl">
                        {/* Ticket ID Badge */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                            <p className="text-white/70 text-xs font-mono">{ticket.id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Status badge for listed tickets */}
                            {ticket.status === 'listed' && (
                              <div className="bg-blue-500/20 backdrop-blur-sm px-3 py-1 rounded-full">
                                <p className="text-blue-400 text-xs font-semibold">LISTED</p>
                              </div>
                            )}
                            {/* Status dot indicator */}
                            <div 
                              className={`w-2.5 h-2.5 rounded-full ${
                                !hasEventPassed(ticket.date) ? 'bg-green-500' : 'bg-red-500'
                              }`}
                              title={!hasEventPassed(ticket.date) ? 'Valid' : 'Event has passed'}
                            />
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
                            <Clock size={20} weight="regular" className="text-white/60 mt-0.5 flex-shrink-0" />
                            <p className="text-white/90 text-sm">{ticket.time}</p>
                          </div>

                          <div className="flex items-start gap-3">
                            <MapPin size={20} weight="regular" className="text-white/60 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-white/90 text-sm">{ticket.venue}</p>
                              <p className="text-white/60 text-xs">{ticket.location}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <TicketIcon size={20} weight="regular" className="text-white/60 mt-0.5 flex-shrink-0" />
                            <p className="text-white/90 text-sm">{ticket.ticketType}</p>
                          </div>
                        </div>

                        {/* Footer / Actions */}
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                          {ticket.status === 'listed' ? (
                            <>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-white/50 text-xs">Listed for:</p>
                                <p className="text-green-400 font-bold">${ticket.listingPrice}</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelListing(ticket.id);
                                }}
                                className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs py-2 rounded-lg transition-colors"
                              >
                                Cancel Listing
                              </button>
                            </>
                          ) : canListTicket(ticket) ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleListForSale(ticket);
                              }}
                              className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                              <Tag size={14} weight="regular" />
                              List for Sale
                            </button>
                          ) : ticket.status === 'owned' && hasEventPassed(ticket.date) ? (
                            <div className="text-center py-2">
                              <p className="text-red-400/60 text-xs">Event has passed</p>
                            </div>
                          ) : null}
                          <p className="text-white/40 text-xs text-center pt-2">
                            {ticket.status === 'listed' ? 'Listed - QR code locked' : 'Tap to view QR code'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Back of card - QR code */}
                    <div
                      className="absolute w-full h-full backface-hidden"
                      style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                      }}
                    >
                      <div className="h-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center hover:bg-white/10 transition-all shadow-xl">
                        {/* QR Code - centered and responsive */}
                        <div className="flex-1 flex items-center justify-center">
                          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-2xl">
                            <QRCodeSVG
                              value={ticket.qrData}
                              size={qrSize}
                              level="H"
                              includeMargin={true}
                              className="w-full h-auto"
                            />
                          </div>
                        </div>

                        {/* Ticket info */}
                        <div className="text-center space-y-2">
                          <p className="text-white font-semibold text-base sm:text-lg line-clamp-1">
                            {ticket.eventTitle}
                          </p>
                          <p className="text-white/60 text-xs sm:text-sm font-mono">
                            {ticket.id}
                          </p>
                        </div>

                        {/* Footer */}
                        <div className="mt-4">
                          <p className="text-white/40 text-xs text-center">
                            Tap to view details
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Listing Modal */}
      {listingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setListingTicket(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors"
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
                <label className="text-white/70 text-sm">Set your price (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-lg">$</span>
                  <input
                    type="number"
                    value={listingPrice}
                    onChange={(e) => setListingPrice(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pl-8 py-3 text-white text-lg focus:outline-none focus:border-green-500/50 transition-colors"
                  />
                </div>
                <p className="text-white/40 text-xs">Buyers will pay with USDC on Base</p>
              </div>

              <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-3">
                <p className="text-blue-200 text-xs">
                  Your ticket will be temporarily unavailable while listed. You can cancel anytime before it's sold.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setListingTicket(null)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmListing}
                  disabled={!listingPrice || parseFloat(listingPrice) <= 0}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  List Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

