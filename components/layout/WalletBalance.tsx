"use client";

import { Wallet, User } from "phosphor-react";
import { useAccount, useBalance } from 'wagmi';
import { useAuthCheck, useAuthStore } from "@/lib/store/authStore";
import { useRouter } from "next/navigation";

/**
 * WalletBalance Component
 *
 * Displays the user's ETH balance for their Base Account.
 * In guest mode, shows a guest indicator instead.
 *
 * @see https://docs.base.org/mini-apps/core-concepts/base-account
 */
export function WalletBalance() {
  const { isAuthenticated, isGuestMode } = useAuthCheck();
  const { exitGuestMode } = useAuthStore();
  const router = useRouter();

  // In Base mini apps, the wallet is automatically connected
  const { address, isConnected } = useAccount();

  // Use wagmi's useBalance hook for efficient balance fetching
  const { data: balanceData, isLoading } = useBalance({
    address: address,
  });

  // Show guest mode indicator with click to connect
  if (isGuestMode) {
    return (
      <button
        onClick={() => {
          exitGuestMode();
          router.push("/");
        }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 hover:bg-white/20 hover:border-white/30 transition-all active:scale-95"
        title="Click to connect wallet"
      >
        <User size={18} weight="regular" className="text-white/50" />
        <span className="text-white/60 text-sm font-medium">
          Guest Mode
        </span>
      </button>
    );
  }

  if (!isAuthenticated || !isConnected || !address) {
    return null;
  }

  const formatBalance = (value: string) => {
    const num = Number.parseFloat(value);
    return num.toFixed(4);
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 hover:bg-white/10 transition-all">
      <Wallet size={18} weight="regular" className="text-white/70" />
      {isLoading ? (
        <div className="w-16 h-4 bg-white/10 animate-pulse rounded" />
      ) : (
        <span className="text-white/90 text-sm font-medium">
          {balanceData ? formatBalance(balanceData.formatted) : '0.0000'} <span className="text-white/50">ETH</span>
        </span>
      )}
    </div>
  );
}
