"use client";

interface AuthFailureModalProps {
  isOpen: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onContinueAsGuest: () => void;
  onClose: () => void;
}

/**
 * Modal displayed when wallet connection fails
 * Offers users the option to retry or continue browsing as a guest
 */
export function AuthFailureModal({
  isOpen,
  errorMessage,
  onRetry,
  onContinueAsGuest,
  onClose,
}: AuthFailureModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[95vw] sm:max-w-md bg-white/10 border border-white/20 rounded-3xl p-5 sm:p-6 md:p-8 backdrop-blur-2xl shadow-2xl">
        <button
          type="button"
          className="absolute top-4 right-4 text-white/50 hover:text-white/80 transition-colors"
          onClick={onClose}
        >
          ✕
        </button>

        <div className="space-y-5">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-500/20 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-orange-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">
              Connection Failed
            </h2>
            <p className="text-white/60 text-sm">
              {errorMessage || "Unable to connect your wallet"}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-white/70 text-sm leading-relaxed">
              You can retry connecting your wallet or continue browsing as a guest.
              As a guest, you can explore events and the marketplace, but won't be
              able to purchase tickets or perform blockchain actions.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="w-full bg-white text-gray-950 font-semibold py-3.5 px-6 rounded-xl transition-all hover:bg-white/90 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retry Connection
            </button>
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
