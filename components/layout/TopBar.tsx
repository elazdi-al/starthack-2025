"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, QrCode } from "phosphor-react";
import { WalletBalance } from "@/components/layout/WalletBalance";
import { useAuthCheck } from "@/lib/store/authStore";

interface TopBarProps {
  showBackButton?: boolean;
  backPath?: string;
  backTitle?: string;
  title?: string;
  showTitle?: boolean;
  showScanner?: boolean;
  onScannerClick?: () => void;
}

export function TopBar({
  showBackButton = false,
  backPath = "/home",
  backTitle = "Back",
  title,
  showTitle = false,
  showScanner = false,
  onScannerClick
}: TopBarProps) {
  const router = useRouter();
  const { isAuthenticated: _isAuthenticated, fid: _fid } = useAuthCheck();

  const handleBack = () => {
    router.push(backPath);
  };

  return (
    <div>
      {/* Back button, balance, and scanner - fixed at top on mobile */}
      {showBackButton && (
        <div className="fixed top-6 left-4 right-4 z-30 flex items-center justify-between">
          <button
            className="text-white/60 hover:text-white hover:bg-white/5 border-white/10 transition-all flex items-center gap-2 backdrop-blur-sm px-4 py-2 rounded-full border"
            type="button"
            onClick={handleBack}
            title={backTitle}
          >
            <ArrowLeft size={20} weight="regular" />
            <span className="text-sm font-medium">{backTitle}</span>
          </button>
          <div className="flex items-center gap-3">
            <WalletBalance />
            {showScanner && (
              <button
                className="text-white/60 hover:text-white hover:bg-white/5 border-white/10 transition-all backdrop-blur-sm p-2.5 rounded-full border"
                type="button"
                onClick={onScannerClick}
                title="Scan QR Code"
              >
                <QrCode size={20} weight="regular" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Title with Wallet Balance badge */}
      {showTitle && title && (
        <div className={`relative z-10 px-6 pb-4 md:pb-6 ${showBackButton ? 'pt-2 md:pt-8' : 'pt-6 md:pt-8'}`}>
          <div className="flex flex-col gap-2">
            {/* Badge above title on mobile (only when no back button), same row on desktop */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-4">
              {/* Badge - appears first on mobile (above title) - only show if no back button */}
              {!showBackButton && (
                <div className="sm:flex-shrink-0 order-1 md:order-2 flex flex-row justify-end w-full sm:hidden">
                  <div className="w-fit">
                    <WalletBalance />
                  </div>
                </div>
              )}
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
