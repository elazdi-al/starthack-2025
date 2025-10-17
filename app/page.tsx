"use client";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { Button } from "@/components/ui/button";
import { useMiniKit, useQuickAuth } from "@coinbase/onchainkit/minikit";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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

  // Initialize the miniapp
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  const { data: authData, isLoading: isAuthLoading } = useQuickAuth<AuthResponse>(
    "/api/auth",
    { method: "GET" }
  );

  const handleSignIn = () => {
    if (isAuthLoading) {
      return;
    }

    if (authData?.success) {
      // User is already authenticated, navigate to next page
      router.push("/success");
    } else {
      // Handle sign in logic here
      console.log("Initiating sign in...");
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-between p-6 bg-transparent overflow-hidden">
      <BackgroundGradient />

      {/* Title at the top */}
      <div className="flex-1 flex items-start justify-center pt-20 relative z-10">
        <h1 className="text-7xl font-bold tracking-tight text-center text-white">
          Stars
        </h1>
      </div>

      {/* Sign in button at the bottom */}
      <div className="w-full max-w-sm pb-8 relative z-10">
        <Button
          onClick={handleSignIn}
          disabled={isAuthLoading}
          className="w-full h-12 text-base font-semibold"
          size="lg"
        >
          {isAuthLoading ? "Loading..." : "Get Started"}
        </Button>
      </div>
    </div>
  );
}
