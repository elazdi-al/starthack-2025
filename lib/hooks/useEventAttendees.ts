import { useQuery } from "@tanstack/react-query";

interface AttendeesResponse {
  success: boolean;
  attendees: string[];
  count: number;
  error?: string;
}

interface FarcasterProfile {
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

interface FarcasterBatchResponse {
  success: boolean;
  users: Record<string, FarcasterProfile | null>;
  source: string;
}

async function fetchEventAttendees(eventId: number): Promise<string[]> {
  const response = await fetch(`/api/events/${eventId}/attendees`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch attendees");
  }

  const data: AttendeesResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to fetch attendees");
  }

  return data.attendees;
}

async function fetchFarcasterProfiles(
  addresses: string[]
): Promise<Record<string, FarcasterProfile | null>> {
  if (addresses.length === 0) {
    return {};
  }

  const response = await fetch("/api/farcaster/users-by-addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addresses }),
  });

  if (!response.ok) {
    // Return empty object if profiles fail to load
    console.error("Failed to fetch Farcaster profiles");
    return {};
  }

  const data: FarcasterBatchResponse = await response.json();
  return data.users || {};
}

export function useEventAttendees(eventId: number | null) {
  return useQuery({
    queryKey: ["event-attendees", eventId],
    queryFn: async () => {
      if (eventId === null) {
        throw new Error("Event ID is required");
      }

      // First fetch the attendee addresses
      const attendees = await fetchEventAttendees(eventId);

      // Then fetch Farcaster profiles for all attendees
      const profiles = await fetchFarcasterProfiles(attendees);

      // Combine the data
      return {
        attendees: attendees.map((address) => ({
          address,
          farcasterProfile: profiles[address.toLowerCase()] || null,
        })),
        count: attendees.length,
      };
    },
    enabled: eventId !== null,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
}
