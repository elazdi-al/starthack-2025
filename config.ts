import { createConfig, createStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { base, baseSepolia } from "wagmi/chains";
import { currentChain, getTransport } from "./lib/chain";

export const config = createConfig({
  chains: [currentChain],
  connectors: [
    injected({
      shimDisconnect: false,
    }),
  ],
  transports: {
    [base.id]: getTransport(),
    [baseSepolia.id]: getTransport(),
  },
  storage: createStorage({
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  }),
  ssr: true,
  multiInjectedProviderDiscovery: true,
});

export function getConfig() {
  return config
}