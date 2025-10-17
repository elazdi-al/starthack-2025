"use client";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { useMiniKit, useQuickAuth } from "@coinbase/onchainkit/minikit";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BaseAuthButton } from "@/components/BaseAuthButton";
import { useAuthCheck } from "@/lib/store/authStore";

interface AuthResponse {
  success: boolean;
  user?: {
    fid: number;
    issuedAt?: number;
    expiresAt?: number;
  };
  message?: string;
}

export default function Home() {
  const { isFrameReady, setFrameReady } = useMiniKit();
  const router = useRouter();
  const { isAuthenticated } = useAuthCheck();

  // Initialize the miniapp
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/home');
    }
  }, [isAuthenticated, router]);

  useQuickAuth<AuthResponse>(
    "/api/auth",
    { method: "GET" }
  );


  return (
    <div className="relative min-h-screen flex flex-col items-center justify-between p-6 bg-transparent overflow-hidden">
      <BackgroundGradient />
      {/* Title at the top */}
      <div className="flex-1 flex items-start justify-center pt-20 relative z-10">
        <h1 className="text-8xl  tracking-tighter font-bold text-center text-white/30">
          Stars
        </h1>
      </div>

      {/* Sign in buttons at the bottom */}
      <div className="w-full max-w-sm pb-8 space-y-4">
        {/* Base Authentication */}
        <BaseAuthButton />
        
       
      </div>
    </div>
  );
}
