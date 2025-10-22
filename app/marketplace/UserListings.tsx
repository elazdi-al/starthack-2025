import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Ticket } from "@/lib/store/ticketStore";

interface UserListingsProps {
  tickets: Ticket[];
  onCancel: (ticket: Ticket) => Promise<void>;
}

export function UserListings({ tickets, onCancel }: UserListingsProps) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (ticket: Ticket) => {
    setCancellingId(ticket.id);
    try {
      await onCancel(ticket);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="relative z-10 mb-8 px-6 max-w-7xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white/70">Your Listings</h2>
        <span className="text-white/50 text-sm">{tickets.length} active</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="bg-blue-500/10 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 cursor-pointer hover:bg-blue-500/20 transition-all"
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

            <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">{ticket.eventTitle}</h3>

            <p className="text-white/70 text-sm mb-4">{ticket.ticketType}</p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handleCancel(ticket);
              }}
              disabled={cancellingId === ticket.id}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {cancellingId === ticket.id ? (
                <>
                  <span className="w-3.5 h-3.5 border border-red-200/40 border-t-transparent rounded-full animate-spin" />
                  <span>Canceling...</span>
                </>
              ) : (
                "Cancel"
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
