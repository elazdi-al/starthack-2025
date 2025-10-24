import { createConfig, cookieStorage, createStorage, http } from "wagmi";
import { base } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
  chains: [base],
  connectors: [
    injected({
      shimDisconnect: false,
    }),
  ],
  transports: {
    [base.id]: http(),
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