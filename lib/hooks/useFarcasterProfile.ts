import { farcasterAPI, type FarcasterUserProfile } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const farcasterKeys = {
  profile: (address: string) => ["farcaster", "profile", address.toLowerCase()] as const,
};

export function useFarcasterProfile(
  address: string | null | undefined,
  options?: { addressType?: string },
) {
  const addressType = options?.addressType ?? "eth";

  return useQuery({
    queryKey: farcasterKeys.profile(address?? ""),
    queryFn: async (): Promise<FarcasterUserProfile | null> => {
      if (!address) {
        return null;
      }

      const response = await farcasterAPI.getUserByAddress(address, addressType);
      return response.user ?? null;
    },
    enabled: !!address,
    staleTime: 60 * 1000, // cache for 1 minute
  });
}
