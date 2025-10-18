import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Ticket {
  id: string;
  eventId?: number; // Links to event detail page
  eventTitle: string;
  date: string;
  time: string;
  location: string;
  venue: string;
  ticketType: string;
  purchaseDate: string;
  qrData: string;
  isValid: boolean;
  status: 'owned' | 'listed' | 'sold';
  listingPrice?: string;
  listedAt?: number;
}

interface TicketState {
  tickets: Ticket[];
  listings: Ticket[];
}

interface TicketActions {
  addTicket: (ticket: Ticket) => void;
  setTickets: (tickets: Ticket[]) => void;
  listTicket: (ticketId: string, price: string) => void;
  cancelListing: (ticketId: string) => void;
  markAsSold: (ticketId: string) => void;
  getOwnedTickets: () => Ticket[];
  getListedTickets: () => Ticket[];
  clearDuplicates: () => void;
  resetStore: () => void;
}

type TicketStore = TicketState & TicketActions;

export const useTicketStore = create<TicketStore>()(
  persist(
    (set, get) => ({
      // Initial state
      tickets: [],
      listings: [],

      // Add a new ticket (after purchase)
      addTicket: (ticket: Ticket) => {
        set((state) => {
          // Check if ticket already exists
          const exists = state.tickets.some(t => t.id === ticket.id);
          if (exists) {
            console.warn(`Ticket ${ticket.id} already exists, skipping`);
            return state;
          }
          return {
            tickets: [...state.tickets, { ...ticket, status: 'owned' }]
          };
        });
      },

      // Set all tickets (replaces existing tickets)
      setTickets: (tickets: Ticket[]) => {
        set({ tickets });
      },

      // List a ticket for sale
      listTicket: (ticketId: string, price: string) => {
        set((state) => {
          const ticket = state.tickets.find(t => t.id === ticketId);
          
          // Validation: Check if ticket exists and is valid
          if (!ticket) {
            console.error(`Ticket ${ticketId} not found`);
            return state;
          }
          
          // Check if event date has passed
          const eventDate = new Date(ticket.date);
          const now = new Date();
          now.setHours(0, 0, 0, 0); // Reset time to start of day for fair comparison
          
          if (eventDate < now) {
            console.error(`Cannot list ticket ${ticketId}: Event date has passed`);
            return state;
          }
          
          // Check if already listed
          if (ticket.status === 'listed') {
            console.warn(`Ticket ${ticketId} is already listed`);
            return state;
          }
          
          return {
            tickets: state.tickets.map(t =>
              t.id === ticketId
                ? {
                    ...t,
                    status: 'listed' as const,
                    listingPrice: price,
                    listedAt: Date.now()
                  }
                : t
            )
          };
        });
      },

      // Cancel listing and return to owned
      cancelListing: (ticketId: string) => {
        set((state) => ({
          tickets: state.tickets.map(ticket =>
            ticket.id === ticketId
              ? {
                  ...ticket,
                  status: 'owned' as const,
                  listingPrice: undefined,
                  listedAt: undefined
                }
              : ticket
          )
        }));
      },

      // Mark ticket as sold
      markAsSold: (ticketId: string) => {
        set((state) => ({
          tickets: state.tickets.map(ticket =>
            ticket.id === ticketId
              ? { ...ticket, status: 'sold' as const }
              : ticket
          )
        }));
      },

      // Get only owned tickets (not listed or sold)
      getOwnedTickets: () => {
        return get().tickets.filter(t => t.status === 'owned');
      },

      // Get only listed tickets
      getListedTickets: () => {
        return get().tickets.filter(t => t.status === 'listed');
      },

      // Remove duplicate tickets (by ID)
      clearDuplicates: () => {
        set((state) => {
          const uniqueTickets = state.tickets.reduce((acc, ticket) => {
            if (!acc.find(t => t.id === ticket.id)) {
              acc.push(ticket);
            }
            return acc;
          }, [] as Ticket[]);
          
          if (uniqueTickets.length !== state.tickets.length) {
            console.log(`Removed ${state.tickets.length - uniqueTickets.length} duplicate tickets`);
          }
          
          return { tickets: uniqueTickets };
        });
      },

      // Reset store (for testing/debugging)
      resetStore: () => {
        set({ tickets: [], listings: [] });
      },
    }),
    {
      name: 'ticket-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

