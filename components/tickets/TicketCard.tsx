"use client";

import { CalendarBlank, Clock, MapPin, ShareNetwork, Tag, Ticket as TicketIcon } from "phosphor-react";
import { QRCodeSVG } from "qrcode.react";
import type { Ticket } from "@/lib/store/ticketStore";

interface TicketCardProps {
  ticket: Ticket;
  isFlipped: boolean;
  qrSize: number;
  cancellingTicketId: string | null;
  sharingTicketId: string | null;
  isListing: boolean;
  onFlip: (ticketId: string) => void;
  onShare: (ticket: Ticket) => void;
  onListForSale: (ticket: Ticket) => void;
  onCancelListing: (ticket: Ticket) => void;
  hasEventPassed: (dateString: string) => boolean;
  canListTicket: (ticket: Ticket) => boolean;
}

export function TicketCard({
  ticket,
  isFlipped,
  qrSize,
  cancellingTicketId,
  sharingTicketId,
  isListing,
  onFlip,
  onShare,
  onListForSale,
  onCancelListing,
  hasEventPassed,
  canListTicket,
}: TicketCardProps) {
  return (
    <div
      className={`relative h-[420px] perspective-1000 ${
        ticket.status === 'listed' ? 'cursor-not-allowed' : 'cursor-pointer'
      }`}
      onClick={() => onFlip(ticket.id)}
      role="button"
      tabIndex={ticket.status === 'listed' ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onFlip(ticket.id);
        }
      }}
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
          className="absolute w-full h-full"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            opacity: isFlipped ? 0 : 1,
            pointerEvents: isFlipped ? 'none' : 'auto',
            transition: 'opacity 200ms ease',
            transitionDelay: isFlipped ? '250ms' : '0ms',
          }}
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
                {/* Active/Expired badge */}
                <div
                  className={`backdrop-blur-sm px-3 py-1 rounded-full ${
                    !hasEventPassed(ticket.date)
                      ? 'bg-green-500/20'
                      : 'bg-red-500/20'
                  }`}
                >
                  <p className={`text-xs font-semibold ${
                    !hasEventPassed(ticket.date)
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                    {!hasEventPassed(ticket.date) ? 'ACTIVE' : 'EXPIRED'}
                  </p>
                </div>
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
            <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
              {ticket.status === 'listed' ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white/50 text-sm">Listed for:</p>
                    <p className="text-green-400 font-bold text-lg">Ξ {ticket.listingPrice}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelListing(ticket);
                    }}
                    disabled={cancellingTicketId === ticket.id}
                    className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {cancellingTicketId === ticket.id ? (
                      <>
                        <span className="w-4 h-4 border-2 border-red-200/40 border-t-transparent rounded-full animate-spin" />
                        <span>Canceling...</span>
                      </>
                    ) : (
                      "Cancel"
                    )}
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  {/* Share Button */}
                  {ticket.eventId !== undefined && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sharingTicketId !== ticket.id) {
                          onShare(ticket);
                        }
                      }}
                      disabled={sharingTicketId === ticket.id}
                      className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 active:bg-blue-500/40 text-blue-200 text-sm font-semibold py-3.5 rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60 min-h-[64px]"
                    >
                      {sharingTicketId === ticket.id ? (
                        <>
                          <span className="w-5 h-5 border-2 border-blue-200/30 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs">Sharing...</span>
                        </>
                      ) : (
                        <>
                          <ShareNetwork size={24} weight="fill" />
                          <span>Share</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* List for Sale Button */}
                  {canListTicket(ticket) ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onListForSale(ticket);
                      }}
                      disabled={isListing}
                      className="flex-1 bg-green-500/20 hover:bg-green-500/30 active:bg-green-500/40 text-green-400 text-sm font-semibold py-3.5 rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed min-h-[64px]"
                    >
                      <Tag size={24} weight="fill" />
                      <span>Sell</span>
                    </button>
                  ) : ticket.status === 'owned' && hasEventPassed(ticket.date) ? (
                    <div className="flex-1 flex items-center justify-center py-3.5">
                      <p className="text-red-400/60 text-sm">Event has passed</p>
                    </div>
                  ) : null}
                </div>
              )}

              <p className="text-white/40 text-xs text-center pt-1">
                {ticket.status === 'listed' ? 'Listed - QR code locked' : 'Tap to view QR code'}
              </p>
            </div>
          </div>
        </div>

        {/* Back of card - QR code */}
        <div
          className="absolute w-full h-full"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            opacity: isFlipped ? 1 : 0,
            pointerEvents: isFlipped ? 'auto' : 'none',
            transition: 'opacity 200ms ease',
            transitionDelay: isFlipped ? '0ms' : '250ms',
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
}

export function TicketCardSkeleton() {
  return (
    <div className="relative h-[420px]">
      <div className="h-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col animate-pulse">
        {/* Header skeleton */}
        <div className="flex justify-between items-start mb-4">
          <div className="bg-white/10 h-6 w-24 rounded-full" />
          <div className="bg-white/10 h-2.5 w-2.5 rounded-full" />
        </div>

        {/* Title skeleton */}
        <div className="space-y-2 mb-4">
          <div className="bg-white/10 h-6 w-3/4 rounded" />
          <div className="bg-white/10 h-6 w-1/2 rounded" />
        </div>

        {/* Details skeleton */}
        <div className="space-y-3 flex-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="bg-white/10 h-5 w-5 rounded flex-shrink-0" />
              <div className="bg-white/10 h-5 w-40 rounded" />
            </div>
          ))}
        </div>

        {/* Footer skeleton */}
        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 bg-white/10 h-16 rounded-xl" />
            <div className="flex-1 bg-white/10 h-16 rounded-xl" />
          </div>
          <div className="bg-white/10 h-3 w-32 rounded mx-auto" />
        </div>
      </div>
    </div>
  );
}