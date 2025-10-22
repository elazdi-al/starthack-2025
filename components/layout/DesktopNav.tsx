"use client";

import { useRouter, usePathname } from "next/navigation";
import { House, ShoppingCart, Ticket, CalendarCheck } from "phosphor-react";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { memo, useCallback } from "react";

interface DesktopNavProps {
  onEventCreated?: () => void;
}

export const DesktopNav = memo(function DesktopNav({ onEventCreated }: DesktopNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = useCallback((path: string) => pathname === path, [pathname]);

  const navigateTo = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  return (
    <div className="hidden md:flex fixed top-6 right-6 z-40 items-center gap-3">
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

      {/* Create Event */}
      <CreateEventDialog onEventCreated={onEventCreated} />
    </div>
  );
});
