import { create } from "zustand";
import { eventsAPI, ticketsAPI } from "@/lib/api";

export interface FarcasterProfile {
  fid: number;
  username: string | null;
  display_name: string | null;
  pfp_url: string | null;
  profile: {
    bio: {
      text: string;
    };
  } | null;
  follower_count: number;
  following_count: number;
}

export interface AttendeeWithProfile {
  address: string;
  farcasterProfile: FarcasterProfile | null;
}

export interface Event {
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
  imageURI: string;
  imageCid?: string | null;
  isPrivate: boolean;
  whitelistIsLocked: boolean;
}

export interface Ticket {
  id: string;
  eventId: number;
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
}

interface EventsState {
  // Data
  events: Event[];
  eventsById: Map<number, Event>;
  tickets: Ticket[];
  attendeesByEventId: Map<number, AttendeeWithProfile[]>;

  // Loading states
  isLoadingEvents: boolean;
  isLoadingTickets: boolean;
  isLoadingAttendees: Map<number, boolean>;

  // Error states
  eventsError: string | null;
  ticketsError: string | null;
  attendeesError: Map<number, string>;

  // Actions
  fetchEvents: () => Promise<void>;
  fetchEvent: (eventId: number) => Promise<Event | null>;
  fetchTickets: (address: string) => Promise<void>;
  fetchAttendees: (eventId: number) => Promise<void>;
  validatePurchase: (eventId: number, address: string) => Promise<unknown>;

  // Helpers
  getEvent: (eventId: number) => Event | null;
  getAttendees: (eventId: number) => AttendeeWithProfile[];
  reset: () => void;
}

const initialState = {
  events: [],
  eventsById: new Map(),
  tickets: [],
  attendeesByEventId: new Map(),
  isLoadingEvents: false,
  isLoadingTickets: false,
  isLoadingAttendees: new Map(),
  eventsError: null,
  ticketsError: null,
  attendeesError: new Map(),
};

export const useEventsStore = create<EventsState>((set, get) => ({
  ...initialState,

  fetchEvents: async () => {
    set({ isLoadingEvents: true, eventsError: null });
    try {
      const response = await eventsAPI.getAll();
      const events = response.events;
      const eventsById = new Map(events.map((event) => [event.id, event]));
      set({ events, eventsById, isLoadingEvents: false });
    } catch (error) {
      set({
        eventsError: error instanceof Error ? error.message : "Failed to fetch events",
        isLoadingEvents: false,
      });
    }
  },

  fetchEvent: async (eventId: number) => {
    const existing = get().eventsById.get(eventId);
    if (existing) return existing;

    try {
      const response = await eventsAPI.getById(eventId);
      const event = response.event;
      set((state) => ({
        eventsById: new Map(state.eventsById).set(eventId, event),
        events: state.events.some((e) => e.id === eventId)
          ? state.events.map((e) => (e.id === eventId ? event : e))
          : [...state.events, event],
      }));
      return event;
    } catch (error) {
      console.error("Failed to fetch event:", error);
      return null;
    }
  },

  fetchTickets: async (address: string) => {
    set({ isLoadingTickets: true, ticketsError: null });
    try {
      const response = await ticketsAPI.getByAddress(address);
      const tickets = response.tickets;
      set({ tickets, isLoadingTickets: false });
    } catch (error) {
      set({
        ticketsError: error instanceof Error ? error.message : "Failed to fetch tickets",
        isLoadingTickets: false,
      });
    }
  },

  fetchAttendees: async (eventId: number) => {
    const loadingMap = new Map(get().isLoadingAttendees);
    loadingMap.set(eventId, true);
    set({ isLoadingAttendees: loadingMap });

    try {
      // Fetch attendee addresses
      const response = await fetch(`/api/events/${eventId}/attendees`);
      if (!response.ok) {
        throw new Error("Failed to fetch attendees");
      }
      const data = await response.json();
      const attendeeAddresses: string[] = data.attendees || [];

      // Fetch Farcaster profiles
      let profiles: Record<string, FarcasterProfile | null> = {};
      if (attendeeAddresses.length > 0) {
        const profileResponse = await fetch("/api/farcaster/users-by-addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ addresses: attendeeAddresses }),
        } as never);

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          profiles = profileData.users || {};
        }
      }

      // Combine data
      const attendees: AttendeeWithProfile[] = attendeeAddresses.map((address) => ({
        address,
        farcasterProfile: profiles[address.toLowerCase()] || null,
      }));

      const attendeesMap = new Map(get().attendeesByEventId);
      attendeesMap.set(eventId, attendees);

      const loadingMapComplete = new Map(get().isLoadingAttendees);
      loadingMapComplete.set(eventId, false);

      const errorMap = new Map(get().attendeesError);
      errorMap.delete(eventId);

      set({
        attendeesByEventId: attendeesMap,
        isLoadingAttendees: loadingMapComplete,
        attendeesError: errorMap,
      });
    } catch (error) {
      const loadingMapError = new Map(get().isLoadingAttendees);
      loadingMapError.set(eventId, false);

      const errorMap = new Map(get().attendeesError);
      errorMap.set(
        eventId,
        error instanceof Error ? error.message : "Failed to fetch attendees"
      );

      set({
        isLoadingAttendees: loadingMapError,
        attendeesError: errorMap,
      });
    }
  },

  validatePurchase: async (eventId: number, address: string) => {
    return await ticketsAPI.validatePurchase(eventId, address);
  },

  getEvent: (eventId: number) => {
    return get().eventsById.get(eventId) || null;
  },

  getAttendees: (eventId: number) => {
    return get().attendeesByEventId.get(eventId) || [];
  },

  reset: () => {
    set(initialState);
  },
}));
