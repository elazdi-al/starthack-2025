"use client";
import type { ReactNode } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import "@coinbase/onchainkit/styles.css";
import { WagmiProvider } from "wagmi";
import { config} from "@/config";
export function RootProvider({ children }: { children: ReactNode }) {
  // Create a new QueryClient instance for each user session
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer
            gcTime: 10 * 60 * 1000, // 10 minutes - keep unused data in cache
            refetchOnWindowFocus: false, // Prevent refetch on window focus
            refetchOnMount: false, // Only fetch if data is stale
            refetchOnReconnect: false, // Don't refetch on reconnect
            retry: 1, // Only retry failed requests once
            retryDelay: 1000, // Wait 1s before retry
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}> 
      <OnchainKitProvider
        apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
        chain={base}
        config={{
          appearance: {
            mode: "auto",
          },
          wallet: {
            display: "modal",
            preference: "all",
          },
        }}
        miniKit={{
          enabled: true,
          autoConnect: true,
          notificationProxyUrl: undefined,
        }}
      >
        {children}
      </OnchainKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
