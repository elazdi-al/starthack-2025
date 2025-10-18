"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "phosphor-react";
import { WalletBalance } from "@/components/WalletBalance";

interface TopBarProps {
  showBackButton?: boolean;
  backPath?: string;
  backTitle?: string;
}

export function TopBar({ showBackButton = false, backPath = "/home", backTitle = "Back" }: TopBarProps) {
  const router = useRouter();

  const handleBack = () => {
    router.push(backPath);
  };

  return (
    <>
      {/* Back button - Mobile and Desktop */}
      {showBackButton && (
        <button
          className="absolute top-6 left-6 z-20 text-white/40 hover:text-white/80 transition-colors flex items-center gap-2"
          type="button"
          onClick={handleBack}
          title={backTitle}
        >
          <ArrowLeft size={24} weight="regular" />
          <span className="text-sm">{backTitle}</span>
        </button>
      )}

      {/* Wallet Balance - Top Right - Always visible on desktop, on mobile only when no back button */}
      <div className="absolute top-6 right-6 z-20">
        <WalletBalance />
      </div>
    </>
  );
}
