"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "phosphor-react";
import { WalletBalance } from "@/components/layout/WalletBalance";
import { useAuthCheck } from "@/lib/store/authStore";

interface TopBarProps {
  showBackButton?: boolean;
  backPath?: string;
  backTitle?: string;
  title?: string;
  showTitle?: boolean;
}

export function TopBar({ showBackButton = false, backPath = "/home", backTitle = "Back", title, showTitle = false }: TopBarProps) {
  const router = useRouter();
  const { isAuthenticated: _isAuthenticated, fid: _fid } = useAuthCheck();

  const handleBack = () => {
    router.push(backPath);
  };

  return (
    <div className="sticky top-0 z-30 bg-transparent backdrop-blur-md">
      {/* Back button when showBackButton is true */}
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

      {/* Title with Wallet Balance badge */}
      {showTitle && title && (
        <div className="relative z-10 pt-6 md:pt-8 px-6 pb-4 md:pb-6">
          <div className="flex flex-col gap-2">
            {/* Badge above title on mobile, same row on desktop */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-4">
              {/* Badge - appears first on mobile (above title) */}
              <div className="sm:flex-shrink-0 order-1 md:order-2 flex flex-row justify-end w-full sm:hidden">
                <div className="w-fit">
                  <WalletBalance />
                </div>
              </div>
              {/* Title */}
              <h1 className="text-6xl sm:text-7xl md:text-8xl tracking-tighter font-bold text-white/30 order-2 md:order-1">
                {title}
              </h1>
            </div>

          </div>
        </div>
      )}

      {/* Wallet Balance - Top Right - Desktop only when not showing title */}
      {!showTitle && (
        <div className="absolute top-6 right-6 z-20 hidden md:block">
          <WalletBalance />
        </div>
      )}
    </div>
  );
}
