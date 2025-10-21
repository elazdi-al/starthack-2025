"use client";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BaseAuthButton } from "@/components/BaseAuthButton";
import { useAuthCheck } from "@/lib/store/authStore";
import Image from "next/image";

export default function Home() {
  const { isFrameReady, setFrameReady } = useMiniKit();
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthCheck();

  // Initialize the miniapp
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Redirect if already authenticated (only after hydration)
  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.push('/home');
    }
  }, [hasHydrated, isAuthenticated, router]);

  // Show loading while hydrating
  if (!hasHydrated) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-transparent">
        <BackgroundGradient />
        <div className="relative z-10 text-white/40">Loading...</div>
      </div>
    );
  }

  // Don't render login page if already authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-between p-6 bg-transparent overflow-hidden">
      <BackgroundGradient />
      {/* Title at the top */}
      <div className="flex-1 flex items-start justify-center pt-8 relative z-10">
        <Image src="/hero.svg" alt="Stars" width={192} height={192} className="w-auto h-48" priority />
      </div>

      {/* Sign in buttons at the bottom */}
      <div className="w-full max-w-sm pb-8 space-y-4">
        {/* Farcaster Quick Auth */}
        <BaseAuthButton />
      </div>
    </div>
  );
}
