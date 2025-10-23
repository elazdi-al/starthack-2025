"use client";

import { useRouter, usePathname } from "next/navigation";
import { House, ShoppingCart, Ticket, CalendarCheck } from "phosphor-react";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { memo, useCallback } from "react";

export const BottomNav = memo(function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navigateTo = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  const isActive = useCallback((path: string) => pathname === path, [pathname]);

  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 z-30">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between px-2 py-2 max-w-lg mx-auto">
          {/* Home */}
          <button
            className={`${
              isActive('/home')
                ? 'text-white bg-white/10'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            } active:scale-95 transition-all flex flex-col items-center gap-1 px-2 py-2 rounded-2xl min-w-[64px]`}
            type="button"
            onClick={() => navigateTo('/home')}
            title="Home"
          >
            <House className="w-7 h-7" weight={isActive('/home') ? 'fill' : 'regular'} />
            <span className="text-xs font-semibold whitespace-nowrap">Home</span>
          </button>

          {/* Marketplace */}
          <button
            className={`${
              isActive('/marketplace')
                ? 'text-white bg-white/10'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            } active:scale-95 transition-all flex flex-col items-center gap-1 px-2 py-2 rounded-2xl min-w-[64px]`}
            type="button"
            onClick={() => navigateTo('/marketplace')}
            title="Marketplace"
          >
            <ShoppingCart className="w-7 h-7" weight={isActive('/marketplace') ? 'fill' : 'regular'} />
            <span className="text-xs font-semibold whitespace-nowrap">Market</span>
          </button>

          {/* Create Event - Centered */}
          <div className="flex-shrink-0">
            <CreateEventDialog />
          </div>

          {/* Tickets */}
          <button
            className={`${
              isActive('/tickets')
                ? 'text-white bg-white/10'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            } active:scale-95 transition-all flex flex-col items-center gap-1 px-2 py-2 rounded-2xl min-w-[64px]`}
            type="button"
            onClick={() => navigateTo('/tickets')}
            title="My Tickets"
          >
            <Ticket className="w-7 h-7" weight={isActive('/tickets') ? 'fill' : 'regular'} />
            <span className="text-xs font-semibold whitespace-nowrap">Tickets</span>
          </button>

          {/* My Events */}
          <button
            className={`${
              isActive('/myevents')
                ? 'text-white bg-white/10'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            } active:scale-95 transition-all flex flex-col items-center gap-1 px-2 py-2 rounded-2xl min-w-[64px]`}
            type="button"
            onClick={() => navigateTo('/myevents')}
            title="My Events"
          >
            <CalendarCheck className="w-7 h-7" weight={isActive('/myevents') ? 'fill' : 'regular'} />
            <span className="text-xs font-semibold whitespace-nowrap">Events</span>
          </button>
        </div>
      </div>
    </div>
  );
});
