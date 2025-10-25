import { getChain } from "@/lib/chain";
import { useCallback } from "react";
import { toast } from "sonner";
import { useAccount, useConnect, useConnectors, useReconnect, useSwitchChain } from "wagmi";

export function useWalletAuth() {
  const { isConnected, address, chainId } = useAccount();
  const { connectAsync } = useConnect();
  const connectors = useConnectors();
  const { reconnectAsync } = useReconnect();
  const { switchChainAsync } = useSwitchChain();

  const ensureWalletConnected = useCallback(async () => {
    const targetChain = getChain();

    // Try to reconnect if we have a cached connection but state is disconnected
    if (!isConnected) {
      try {
        await reconnectAsync();
        if (address) {
          // Small delay to allow wallet state to update
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      } catch {
        // Reconnect failed, continue to fresh connection
      }
    }

    // If still not connected, make a fresh connection
    if (!isConnected || !address) {
      const injected = connectors.find((c) => c.type === "injected");
      if (!injected) {
        toast.error("No wallet found", {
          description: "Please install a wallet extension like MetaMask or Coinbase Wallet.",
        });
        return false;
      }

      try {
        await connectAsync({ connector: injected, chainId: targetChain.id });
        // Small delay to allow wallet state to update
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        console.error("Wallet connection error:", error);
        toast.error("Failed to connect wallet", {
          description: "Please try connecting your wallet again.",
        });
        return false;
      }
    }

    // Ensure we're on the correct chain
    if (chainId !== targetChain.id) {
      try {
        await switchChainAsync({ chainId: targetChain.id });
        // Small delay to allow chain switch to complete
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        console.error("Chain switch error:", error);
        const errorCode =
          typeof error === "object" &&
          error !== null &&
          "code" in error
            ? Number((error as { code?: number }).code)
            : undefined;

        if (errorCode === 4902) {
          toast.error("Network not found", {
            description: `${targetChain.name} network is not added to your wallet. Please add it and try again.`,
          });
        } else {
          toast.error("Failed to switch network", {
            description: `Please switch to ${targetChain.name} manually and try again.`,
          });
        }
        return false;
      }
    }

    return true;
  }, [isConnected, address, chainId, connectors, connectAsync, reconnectAsync, switchChainAsync]);

  return { ensureWalletConnected };
}