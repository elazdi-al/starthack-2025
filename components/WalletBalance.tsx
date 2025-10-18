"use client";

import { useEffect, useState } from "react";
import { Wallet } from "phosphor-react";
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import { useAuthCheck } from "@/lib/store/authStore";

export function WalletBalance() {
  const { address, isAuthenticated } = useAuthCheck();
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!address) return;

      try {
        setIsLoadingBalance(true);
        const client = createPublicClient({
          chain: base,
          transport: http(),
        });

        const balanceInWei = await client.getBalance({
          address: address as `0x${string}`,
        });

        const balanceInEth = formatEther(balanceInWei);
        setBalance(balanceInEth);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance('0');
      } finally {
        setIsLoadingBalance(false);
      }
    };

    if (isAuthenticated && address) {
      fetchBalance();
    }
  }, [address, isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 hover:bg-white/10 transition-all">
      <Wallet size={18} weight="regular" className="text-white/70" />
      {isLoadingBalance ? (
        <div className="w-16 h-4 bg-white/10 animate-pulse rounded"></div>
      ) : (
        <span className="text-white/90 text-sm font-medium">
          {balance ? parseFloat(balance).toFixed(4) : '0.0000'} <span className="text-white/50">ETH</span>
        </span>
      )}
    </div>
  );
}
