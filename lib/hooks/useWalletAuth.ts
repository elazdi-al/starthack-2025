import { useCallback } from "react";
import { useAccount, useConnect, useConnectors } from "wagmi";
import { base } from "wagmi/chains";
import { toast } from "sonner";

export function useWalletAuth() {
  const { isConnected } = useAccount();
  const { connect } = useConnect();
  const connectors = useConnectors();

  const ensureWalletConnected = useCallback(async () => {
    if (isConnected) {
      return true;
    }

    const injected = connectors.find((c) => c.type === "injected");
    if (!injected) {
      toast.error("No wallet found", {
        description: "Please install a wallet extension like MetaMask or Coinbase Wallet.",
      });
      return false;
    }

    try {
      await connect({ connector: injected, chainId: base.id });
      // Small delay to allow wallet state to update
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    } catch {
      toast.error("Failed to connect wallet", {
        description: "Please try connecting your wallet again.",
      });
      return false;
    }
  }, [isConnected, connectors, connect]);

  return { ensureWalletConnected };
}