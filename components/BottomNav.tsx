"use client";

import { useRouter, usePathname } from "next/navigation";
import { House, ShoppingCart, Plus, Ticket, SignOut } from "phosphor-react";
import { useAuthStore } from "@/lib/store/authStore";
import { CreateEventDialog } from "@/components/CreateEventDialog";

interface BottomNavProps {
  onEventCreated?: () => void;
}

export function BottomNav({ onEventCreated }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { clearAuth } = useAuthStore();

  const handleHome = () => {
    router.push('/home');
  };

  const handleMarketplace = () => {
    router.push('/marketplace');
  };

  const handleTickets = () => {
    router.push('/tickets');
  };

  const handleSignOut = () => {
    clearAuth();
    router.push('/');
  };

  const isActive = (path: string) => pathname === path;

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-30">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
        <div className="flex items-center justify-around px-2 py-3 max-w-lg mx-auto">
          {/* Home */}
          <button
            className={`${
              isActive('/home')
                ? 'text-white/80 bg-white/5'
                : 'text-white/40 hover:text-white/80 hover:bg-white/5'
            } active:text-white/90 active:scale-95 transition-all flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl`}
            type="button"
            onClick={handleHome}
            title="Home"
          >
            <House size={24} weight={isActive('/home') ? 'fill' : 'regular'} />
            <span className="text-[11px] font-semibold whitespace-nowrap">Home</span>
          </button>

          {/* Marketplace */}
          <button
            className={`${
              isActive('/marketplace')
                ? 'text-white/80 bg-white/5'
                : 'text-white/40 hover:text-white/80 hover:bg-white/5'
            } active:text-white/90 active:scale-95 transition-all flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl`}
            type="button"
            onClick={handleMarketplace}
            title="Marketplace"
          >
            <ShoppingCart size={24} weight={isActive('/marketplace') ? 'fill' : 'regular'} />
            <span className="text-[11px] font-semibold whitespace-nowrap">Market</span>
          </button>

          {/* Create Event */}
          <CreateEventDialog onEventCreated={onEventCreated} />

          {/* Tickets */}
          <button
            className={`${
              isActive('/tickets')
                ? 'text-white/80 bg-white/5'
                : 'text-white/40 hover:text-white/80 hover:bg-white/5'
            } active:text-white/90 active:scale-95 transition-all flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl`}
            type="button"
            onClick={handleTickets}
            title="My Tickets"
          >
            <Ticket size={24} weight={isActive('/tickets') ? 'fill' : 'regular'} />
            <span className="text-[11px] font-semibold whitespace-nowrap">Tickets</span>
          </button>

          {/* Sign Out */}
          <button
            className="text-white/40 hover:text-white/80 active:text-white/90 active:scale-95 transition-all flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl hover:bg-white/5"
            type="button"
            onClick={handleSignOut}
            title="Sign Out"
          >
            <SignOut size={24} weight="regular" />
            <span className="text-[11px] font-semibold whitespace-nowrap">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
