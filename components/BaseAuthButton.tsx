"use client";

import { useBaseAuth } from "@/lib/useBaseAuth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function BaseAuthButton() {
  const { isLoading, isAuthenticated, address, error, signInWithBase, signOut } = useBaseAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      // Navigate to success page on successful authentication
      router.push('/home');
    }
  }, [isAuthenticated, router]);

  const handleClick = async () => {
    if (isAuthenticated) {
      signOut();
    } else {
      await signInWithBase();
    }
  };

  return (
    <div className="w-full max-w-sm space-y-4">
      <Button
        onClick={handleClick}
        disabled={isLoading}
        className="w-full h-12 text-base font-semibold"
        size="lg"
        variant="default"
      >
        {isLoading 
          ? "Connecting..." 
          : isAuthenticated 
            ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}`
            : "Sign In with Base"
        }
      </Button>
      
      {error && (
        <div className="text-sm text-red-500 text-center">
          {error}
        </div>
      )}
      
      {isAuthenticated && address && (
        <div className="text-sm text-muted-foreground text-center">
          Authenticated with {address}
        </div>
      )}
    </div>
  );
}

