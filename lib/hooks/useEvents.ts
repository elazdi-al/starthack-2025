import { eventsAPI, ticketsAPI } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Query keys for better cache management
export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, "detail"] as const,
  detail: (id: number) => [...eventKeys.details(), id] as const,
};

export const ticketKeys = {
  all: ["tickets"] as const,
  byAddress: (address: string) => [...ticketKeys.all, "address", address] as const,
};

/**
 * Fetch all events with caching
 */
export function useEvents(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: eventKeys.lists(),
    queryFn: async () => {
      const response = await eventsAPI.getAll();
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Fetch a single event by ID with caching
 */
export function useEvent(eventId: number | null) {
  return useQuery({
    queryKey: eventKeys.detail(eventId ?? 0),
    queryFn: async () => {
      if (eventId === null || Number.isNaN(eventId) || eventId < 0) {
        throw new Error("Invalid event ID");
      }
      const response = await eventsAPI.getById(eventId);
      return response;
    },
    enabled: eventId !== null && !Number.isNaN(eventId) && eventId >= 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch tickets for an address with caching
 */
export function useTickets(address: string | null | undefined) {
  return useQuery({
    queryKey: ticketKeys.byAddress(address ?? ""),
    queryFn: async () => {
      if (!address) {
        throw new Error("Address is required");
      }
      const response = await ticketsAPI.getByAddress(address);
      return response;
    },
    enabled: !!address,
    staleTime: 3 * 60 * 1000, // 3 minutes (tickets change more frequently)
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation for validating ticket purchase
 */
export function useValidatePurchase() {
  return useMutation({
    mutationFn: async ({
      eventId,
      address,
    }: {
      eventId: number;
      address: string;
    }) => {
      return await ticketsAPI.validatePurchase(eventId, address);
    },
  });
}

/**
 * Hook to invalidate event-related queries
 * Use this after creating/updating events
 */
export function useInvalidateEvents() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: eventKeys.all }),
    invalidateList: () => queryClient.invalidateQueries({ queryKey: eventKeys.lists() }),
    invalidateDetail: (id: number) =>
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) }),
    invalidateTickets: (address: string) =>
      queryClient.invalidateQueries({ queryKey: ticketKeys.byAddress(address) }),
  };
}
