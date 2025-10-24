"use client";

import { useCallback, useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { Bell, X } from "phosphor-react";
import { useAccount } from "wagmi";
import { useAuthCheck } from "@/lib/store/authStore";

interface NotificationPromptProps {
  onDismiss?: () => void;
}

export function NotificationPrompt({ onDismiss }: NotificationPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inMiniApp, setInMiniApp] = useState(false);
  const { address } = useAccount();
  const { fid } = useAuthCheck();

  useEffect(() => {
    // Check if running in mini app
    const checkEnvironment = async () => {
      const result = await sdk.isInMiniApp().catch(() => false);
      setInMiniApp(result);

      // Only show prompt if in mini app and user hasn't dismissed it recently
      if (result) {
        const dismissed = localStorage.getItem('notification-prompt-dismissed');
        if (!dismissed) {
          setIsVisible(true);
        }
      }
    };

    void checkEnvironment();
  }, []);

  const handleEnableNotifications = useCallback(async () => {
    if (!inMiniApp) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await sdk.actions.addMiniApp();

      if (response.notificationDetails) {
        // Map FID to wallet address if both are available
        if (fid && address) {
          await fetch('/api/user/map-fid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fid, address }),
          }).catch((error) => {
            console.error('Failed to map FID to address:', error);
          });
        }

        setIsVisible(false);
        localStorage.setItem('notification-prompt-dismissed', 'true');

        if (onDismiss) {
          onDismiss();
        }
      }
    } catch (error) {
      console.error("Failed to enable notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [inMiniApp, fid, address, onDismiss]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    // Remember dismissal for 7 days
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('notification-prompt-dismissed', expiresAt.toString());

    if (onDismiss) {
      onDismiss();
    }
  }, [onDismiss]);

  if (!isVisible || !inMiniApp) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:max-w-md z-50 animate-in slide-in-from-bottom duration-300">
      <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors"
          aria-label="Dismiss"
        >
          <X size={20} weight="bold" />
        </button>

        {/* Content */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <Bell size={24} weight="fill" className="text-white/90" />
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-white/90 font-semibold text-lg mb-1">
                Enable Notifications
              </h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Get notified when someone joins your events so you never miss an attendee!
              </p>
            </div>

            <button
              type="button"
              onClick={handleEnableNotifications}
              disabled={isLoading}
              className="w-full bg-white text-gray-950 font-semibold py-2.5 px-4 rounded-xl transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? "Enabling..." : "Enable Notifications"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
