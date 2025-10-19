"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, SignOut } from "phosphor-react";
import { WalletBalance } from "@/components/WalletBalance";
import { useAuthCheck, useAuthStore } from "@/lib/store/authStore";

interface TopBarProps {
  showBackButton?: boolean;
  backPath?: string;
  backTitle?: string;
  title?: string;
  showTitle?: boolean;
}

export function TopBar({ showBackButton = false, backPath = "/home", backTitle = "Back", title, showTitle = false }: TopBarProps) {
  const router = useRouter();
  const { isAuthenticated, fid } = useAuthCheck();
  const { clearAuth } = useAuthStore();

  const handleBack = () => {
    router.push(backPath);
  };

  const handleSignOut = () => {
    clearAuth();
    router.push('/');
  };

  return (
    <>
      {/* Sign Out button - Top Left Corner */}
      <button
        className="absolute top-6 left-6 z-20 text-white/40 hover:text-white/80 transition-colors bg-white/5 backdrop-blur-sm p-2 rounded-full border border-white/10 hover:bg-white/10"
        type="button"
        onClick={handleSignOut}
        title="Sign Out"
      >
        <SignOut size={20} weight="regular" />
      </button>

      {/* Back button - Desktop only when showBackButton is true */}
      {showBackButton && (
        <button
          className="absolute top-6 left-16 z-20 text-white/40 hover:text-white/80 transition-colors flex items-center gap-2"
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
            {/* Connected FID */}
            {isAuthenticated && fid && (
              <p className="text-xs md:text-sm text-white/50">
                FID: {fid}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Wallet Balance - Top Right - Desktop only when not showing title */}
      {!showTitle && (
        <div className="absolute top-6 right-6 z-20 hidden md:block">
          <WalletBalance />
        </div>
      )}
    </>
  );
}
