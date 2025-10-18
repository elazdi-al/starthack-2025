"use client";

import { useFarcasterAuth } from "@/lib/useFarcasterAuth";
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Farcaster authentication button component
 * 
 * Provides a native mini app authentication experience using Farcaster Quick Auth.
 * Automatically redirects to home page upon successful authentication.
 */
export function BaseAuthButton() {
  const { isAuthenticated, fid, signIn, isLoading, error } = useFarcasterAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/home");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return (
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center text-white/80">
          <p className="text-sm text-white/60 mb-2">Authenticated as</p>
          <p className="text-lg font-semibold">FID: {fid}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      <SignInWithBaseButton 
        onClick={() => signIn()} 
        colorScheme="dark"
      />
      {isLoading && (
        <p className="text-sm text-white/60 text-center">Authenticating...</p>
      )}
      {error && (
        <p className="text-sm text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
