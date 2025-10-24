import { createConfig, cookieStorage, createStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { currentChain, getTransport } from "./lib/chain";

export const config = createConfig({
  chains: [currentChain],
  connectors: [
    injected({
      shimDisconnect: false,
    }),
  ],
  transports: {
    [currentChain.id]: getTransport(),
  },
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  multiInjectedProviderDiscovery: true,
});

export function getConfig() {
  return config
}