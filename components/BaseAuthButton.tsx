"use client";

import { useFarcasterAuth } from "@/lib/useFarcasterAuth";
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { AuthFailureModal } from "./AuthFailureModal";

const shortenAddress = (value: string) =>
  value ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;

/**
 * Farcaster authentication button component
 * 
 * Provides a native mini app authentication experience using Farcaster Quick Auth.
 * Automatically redirects to home page upon successful authentication.
 */
export function BaseAuthButton() {
  const { isAuthenticated, fid, address, authMethod, signIn, isLoading, error, enterGuestMode } = useFarcasterAuth();
  const router = useRouter();
  const [isMiniApp, setIsMiniApp] = useState<boolean | null>(null);
  const [showAuthFailureModal, setShowAuthFailureModal] = useState(false);
  const autoSignInAttemptedRef = useRef(false);

  // Detect if we're running inside the Base / Farcaster mini app.
  useEffect(() => {
    let mounted = true;

    sdk.isInMiniApp()
      .then((inMiniApp) => {
        if (mounted) {
          setIsMiniApp(inMiniApp);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsMiniApp(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Automatically sign in when inside the mini app environment.
  useEffect(() => {
    if (
      isMiniApp !== true ||
      isAuthenticated ||
      isLoading ||
      autoSignInAttemptedRef.current
    ) {
      return;
    }

    autoSignInAttemptedRef.current = true;

    void signIn().catch((err) => {
      // If auto sign-in fails, allow manual retry via button.
      console.error("Automatic mini app sign-in failed:", err);
      autoSignInAttemptedRef.current = false;
    });
  }, [isMiniApp, isAuthenticated, isLoading, signIn]);

  // Show modal when authentication fails (but not for user rejection or in mini app)
  useEffect(() => {
    if (error && !isMiniApp && !error.includes('rejected')) {
      setShowAuthFailureModal(true);
    }
  }, [error, isMiniApp]);

  // Redirect on successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/home");
    }
  }, [isAuthenticated, router]);

  const handleRetry = async () => {
    setShowAuthFailureModal(false);
    await signIn();
  };

  const handleContinueAsGuest = () => {
    setShowAuthFailureModal(false);
    enterGuestMode();
    // Redirect to home after entering guest mode
    router.push("/home");
  };

  const handleCloseModal = () => {
    setShowAuthFailureModal(false);
  };

  if (isAuthenticated) {
    return (
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center text-white/80">
          <p className="text-sm text-white/60 mb-2">Authenticated as</p>
          {authMethod === "farcaster" && fid !== null ? (
            <p className="text-lg font-semibold">FID: {fid}</p>
          ) : (
            <p className="text-lg font-semibold">
              Wallet: {address ? shortenAddress(address) : "Connected"}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-sm space-y-4">
        <SignInWithBaseButton
          onClick={() => {
            if (!isLoading) {
              void signIn();
            }
          }}
          colorScheme="dark"
        />
        {isLoading && (
          <p className="text-sm text-white/60 text-center">Authenticating...</p>
        )}
        {error && !showAuthFailureModal && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}
        <button
          type="button"
          onClick={handleContinueAsGuest}
          className="w-full text-sm text-white/60 hover:text-white/80 transition-colors py-2"
        >
          or continue as guest
        </button>
      </div>

      <AuthFailureModal
        isOpen={showAuthFailureModal}
        errorMessage={error}
        onRetry={handleRetry}
        onContinueAsGuest={handleContinueAsGuest}
        onClose={handleCloseModal}
      />
    </>
  );
}
