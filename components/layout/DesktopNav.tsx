"use client";

import { useRouter, usePathname } from "next/navigation";
import { House, ShoppingCart, Ticket, CalendarCheck, QrCode, ArrowLeft, Trophy } from "phosphor-react";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { WalletBalance } from "@/components/layout/WalletBalance";
import { memo, useCallback } from "react";

interface DesktopNavProps {
  showScanner?: boolean;
  onScannerClick?: () => void;
  variant?: "default" | "event-detail";
  backPath?: string;
  backTitle?: string;
  pageTitle?: string;
  showLeaderboard?: boolean;
}

export const DesktopNav = memo(function DesktopNav({
  showScanner = false,
  onScannerClick,
  variant = "default",
  backPath = "/home",
  backTitle = "Back to Events",
  pageTitle,
  showLeaderboard = false
}: DesktopNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = useCallback((path: string) => pathname === path, [pathname]);

  const navigateTo = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  const handleLeaderboard = useCallback(() => {
    router.push("/leaderboard");
  }, [router]);

  // Event detail variant - simplified layout
  if (variant === "event-detail") {
    return (
      <div className="hidden md:flex fixed top-6 left-6 right-6 z-40 items-center justify-between">
        {/* Left: Back button and page title */}
        <div className="flex items-center gap-4">
          <button
            className="text-white/60 hover:text-white hover:bg-white/5 border-white/10 transition-all flex items-center gap-2 backdrop-blur-sm px-4 py-2 rounded-full border"
            type="button"
            onClick={() => navigateTo(backPath)}
            title={backTitle}
          >
            <ArrowLeft size={20} weight="regular" />
            <span className="text-sm font-medium">{backTitle}</span>
          </button>
          {pageTitle && (
            <h1 className="text-white text-lg font-semibold">{pageTitle}</h1>
          )}
        </div>

        {/* Right: Balance and QR scanner */}
        <div className="flex items-center gap-3">
          <WalletBalance />
          {showScanner && (
            <button
              className="text-white/60 hover:text-white hover:bg-white/5 border-white/10 transition-all backdrop-blur-sm p-2.5 rounded-full border"
              type="button"
              onClick={onScannerClick}
              title="Scan QR Code"
            >
              <QrCode size={22} weight="regular" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default variant - full navigation
  return (
    <div className="hidden md:flex fixed top-6 right-6 z-40 items-center gap-3">
      {/* Wallet Balance */}
      <WalletBalance />

      {/* Leaderboard */}
      {showLeaderboard && (
        <button
          onClick={handleLeaderboard}
          className="bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all p-2.5 rounded-full group"
          title="View Leaderboard"
          type="button"
        >
          <Trophy size={20} weight="fill" className="text-yellow-400 group-hover:text-yellow-300 transition-colors" />
        </button>
      )}

      {/* Home */}
      <button
        className={`${
          isActive('/home')
            ? 'text-white bg-white/10 border-white/20'
            : 'text-white/60 hover:text-white hover:bg-white/5 border-white/10'
        } transition-all flex items-center gap-2 backdrop-blur-sm px-4 py-2 rounded-full border`}
        type="button"
        onClick={() => navigateTo('/home')}
        title="Home"
      >
        <House size={20} weight={isActive('/home') ? 'fill' : 'regular'} />
        <span className="text-sm font-medium">Home</span>
      </button>

      {/* Marketplace */}
      <button
        className={`${
          isActive('/marketplace')
            ? 'text-white bg-white/10 border-white/20'
            : 'text-white/60 hover:text-white hover:bg-white/5 border-white/10'
        } transition-all flex items-center gap-2 backdrop-blur-sm px-4 py-2 rounded-full border`}
        type="button"
        onClick={() => navigateTo('/marketplace')}
        title="Marketplace"
      >
        <ShoppingCart size={20} weight={isActive('/marketplace') ? 'fill' : 'regular'} />
        <span className="text-sm font-medium">Marketplace</span>
      </button>

      {/* My Events */}
      <button
        className={`${
          isActive('/myevents')
            ? 'text-white bg-white/10 border-white/20'
            : 'text-white/60 hover:text-white hover:bg-white/5 border-white/10'
        } transition-all flex items-center gap-2 backdrop-blur-sm px-4 py-2 rounded-full border`}
        type="button"
        onClick={() => navigateTo('/myevents')}
        title="My Events"
      >
        <CalendarCheck size={20} weight={isActive('/myevents') ? 'fill' : 'regular'} />
        <span className="text-sm font-medium">My Events</span>
      </button>

      {/* My Tickets */}
      <button
        className={`${
          isActive('/tickets')
            ? 'text-white bg-white/10 border-white/20'
            : 'text-white/60 hover:text-white hover:bg-white/5 border-white/10'
        } transition-all flex items-center gap-2 backdrop-blur-sm px-4 py-2 rounded-full border`}
        type="button"
        onClick={() => navigateTo('/tickets')}
        title="My Tickets"
      >
        <Ticket size={20} weight={isActive('/tickets') ? 'fill' : 'regular'} />
        <span className="text-sm font-medium">Tickets</span>
      </button>

      {/* QR Scanner - only show when needed */}
      {showScanner && (
        <button
          className="text-white/60 hover:text-white hover:bg-white/5 border-white/10 transition-all flex items-center gap-2 backdrop-blur-sm px-4 py-2 rounded-full border"
          type="button"
          onClick={onScannerClick}
          title="Scan QR Code"
        >
          <QrCode size={20} weight="regular" />
          <span className="text-sm font-medium">Scan QR</span>
        </button>
      )}

      {/* Create Event */}
      <CreateEventDialog />
    </div>
  );
});
