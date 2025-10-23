"use client";

import { BackgroundGradient } from "@/components/layout/BackgroundGradient";
import { TopBar } from "@/components/layout/TopBar";
import { DesktopNav } from "@/components/layout/DesktopNav";
import { useAuthCheck } from "@/lib/store/authStore";
import { useTicketVerification } from "@/lib/hooks/useTicketVerification";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Warning, XCircle } from "phosphor-react";
import { useEffect, useRef, useState, Suspense, useCallback } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";

function ScannerPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, hasHydrated } = useAuthCheck();
  const { address: walletAddress } = useAccount();

  // TanStack Query mutation for verification
  const verificationMutation = useTicketVerification();

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Local state
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get eventId from URL params if present
  const eventId = searchParams.get('eventId');

  // Disable scrolling on mount
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalHeight = document.body.style.height;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.height = '100%';
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.height = originalHeight;
      document.body.style.width = '';
    };
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push('/');
    }
  }, [hasHydrated, isAuthenticated, router]);

  // Initialize camera
  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }, // Use back camera on mobile
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setIsScanning(true);
          setError(null);
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("Unable to access camera. Please grant camera permissions.");
        toast.error("Camera access denied", {
          description: "Please enable camera permissions to scan QR codes"
        });
      }
    };

    startCamera();

    // Cleanup
    return () => {
      const video = videoRef.current;
      if (video?.srcObject) {
        const stream = video.srcObject as MediaStream;
        const tracks = stream.getTracks();
        for (const track of tracks) {
          track.stop();
        }
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [hasHydrated, isAuthenticated]);

  // Handle ticket verification using TanStack Query mutation
  const handleVerifyTicket = useCallback((qrData: string, eventIdParam: string, owner: string) => {
    verificationMutation.mutate(
      {
        qrData,
        eventId: eventIdParam,
        eventOwner: owner,
      },
      {
        onSuccess: (result) => {
          if (result.valid) {
            // Success - valid ticket
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200]); // Double vibration for success
            }
            toast.success("Valid Ticket! ✓", {
              description: result.message,
            });
          } else {
            // Invalid ticket
            if ('vibrate' in navigator) {
              navigator.vibrate([500]); // Long vibration for error
            }
            toast.error("Invalid Ticket ✗", {
              description: result.message || result.error,
            });
          }
        },
        onError: (err) => {
          console.error('Verification error:', err);
          if ('vibrate' in navigator) {
            navigator.vibrate([500]);
          }
          toast.error("Verification Failed", {
            description: err instanceof Error ? err.message : "Could not verify ticket. Please try again.",
          });
        },
      }
    );
  }, [verificationMutation]);

  // Scan for QR codes
  useEffect(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;

    const scanQRCode = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) return;

      // Set canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        // Import jsQR dynamically
        const { default: jsQR } = await import("jsqr");
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          setScannedData(code.data);
          setIsScanning(false);
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
          }

          // Haptic feedback if available
          if ('vibrate' in navigator) {
            navigator.vibrate(200);
          }

          // Verify ticket if eventId is present
          if (eventId && walletAddress) {
            handleVerifyTicket(code.data, eventId, walletAddress);
          } else {
            toast.success("QR Code Scanned!", {
              description: "Code detected successfully"
            });
          }
        }
      } catch (err) {
        console.error("QR scan error:", err);
      }
    };

    // Scan every 300ms
    scanIntervalRef.current = setInterval(scanQRCode, 300);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isScanning, eventId, walletAddress, handleVerifyTicket]);

  const handleReset = () => {
    setScannedData(null);
    verificationMutation.reset();
    setIsScanning(true);
    if (!scanIntervalRef.current && videoRef.current) {
      // Restart scanning
      const scanQRCode = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
          return;
        }

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const { default: jsQR } = await import("jsqr");
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            setScannedData(code.data);
            setIsScanning(false);
            if (scanIntervalRef.current) {
              clearInterval(scanIntervalRef.current);
            }
            
            if ('vibrate' in navigator) {
              navigator.vibrate(200);
            }

            // Verify ticket if eventId is present
            if (eventId && walletAddress) {
              handleVerifyTicket(code.data, eventId, walletAddress);
            } else {
              toast.success("QR Code Scanned!");
            }
          }
        } catch (err) {
          console.error("QR scan error:", err);
        }
      };

      scanIntervalRef.current = setInterval(scanQRCode, 300);
    }
  };

  // Show loading while hydrating
  if (!hasHydrated) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-transparent">
        <BackgroundGradient />
        <div className="relative z-10 text-white/40">Loading...</div>
      </div>
    );
  }

  // Will redirect if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Determine back path based on where user came from
  const backPath = eventId ? `/event/${eventId}` : "/tickets";
  const backTitle = eventId ? "Back to Event" : "Back to Tickets";

  return (
    <div className="fixed inset-0 flex flex-col bg-black overflow-hidden touch-none">
      <BackgroundGradient />

      {/* Mobile Top Bar */}
      <div className="md:hidden">
        <TopBar title="Scan QR Code" showTitle={true} showBackButton={true} backPath={backPath} backTitle={backTitle} />
      </div>

      {/* Desktop Navigation */}
      <DesktopNav
        variant="event-detail"
        backPath={backPath}
        backTitle={backTitle}
        pageTitle="Scan QR Code"
      />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center overflow-hidden touch-none">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 overflow-hidden">
            <div className="max-w-md w-full text-center space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                <XCircle size={48} weight="regular" className="text-red-400 mx-auto mb-4" />
                <p className="text-red-400 text-lg font-semibold mb-2">Camera Error</p>
                <p className="text-white/60 text-sm">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : scannedData ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 overflow-y-auto overscroll-none">
            <div className="max-w-md w-full space-y-4 py-6">
              {verificationMutation.isPending ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white text-lg font-semibold">Verifying Ticket...</p>
                  <p className="text-white/60 text-sm mt-2">Checking blockchain records</p>
                </div>
              ) : verificationMutation.data ? (
                <div className={`${
                  verificationMutation.data.valid
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                } border rounded-2xl p-6`}>
                  {verificationMutation.data.valid ? (
                    <CheckCircle size={64} weight="fill" className="text-green-400 mx-auto mb-4" />
                  ) : (
                    <XCircle size={64} weight="fill" className="text-red-400 mx-auto mb-4" />
                  )}

                  <p className={`${
                    verificationMutation.data.valid ? 'text-green-400' : 'text-red-400'
                  } text-2xl font-bold mb-2 text-center`}>
                    {verificationMutation.data.valid ? 'VALID TICKET ✓' : 'INVALID TICKET ✗'}
                  </p>

                  <p className="text-white/80 text-center mb-6">
                    {verificationMutation.data.message}
                  </p>

                  {verificationMutation.data.details && (
                    <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-3 text-sm">
                      {verificationMutation.data.details.eventName && (
                        <div>
                          <span className="text-white/50">Event: </span>
                          <span className="text-white font-semibold">{verificationMutation.data.details.eventName}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-white/50">Token ID: </span>
                        <span className="text-white font-mono">{verificationMutation.data.details.tokenId}</span>
                      </div>
                      {verificationMutation.data.details.currentOwner && (
                        <div>
                          <span className="text-white/50">Holder: </span>
                          <span className="text-white font-mono text-xs">
                            {verificationMutation.data.details.currentOwner.slice(0, 6)}...
                            {verificationMutation.data.details.currentOwner.slice(-4)}
                          </span>
                        </div>
                      )}

                      {verificationMutation.data.valid && verificationMutation.data.details.verifiedChecks && (
                        <div className="pt-3 border-t border-white/10">
                          <p className="text-white/50 text-xs mb-2">Verification Status:</p>
                          {verificationMutation.data.details.verifiedChecks.map((check) => (
                            <div key={check} className="flex items-start gap-2 text-xs mb-1">
                              <span className={check.includes('⚠') ? 'text-yellow-400' : 'text-green-400'}>
                                {check}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {verificationMutation.data.details.ownerChanged && (
                        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                          <Warning size={16} className="text-yellow-400" />
                          <span className="text-yellow-400 text-xs">Note: Ticket was resold to current holder</span>
                        </div>
                      )}
                    </div>
                  )}

                  {!verificationMutation.data.valid && verificationMutation.data.error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-6">
                      <p className="text-red-300 text-xs font-semibold mb-1">Error:</p>
                      <p className="text-red-200 text-xs">{verificationMutation.data.error}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors"
                  >
                    Scan Next Ticket
                  </button>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <CheckCircle size={48} weight="fill" className="text-green-400 mx-auto mb-4" />
                  <p className="text-green-400 text-lg font-semibold mb-4 text-center">Scan Successful!</p>
                  
                  <div className="bg-white/5 rounded-xl p-4 mb-4">
                    <p className="text-white/50 text-xs mb-2">Scanned Data:</p>
                    <p className="text-white text-sm font-mono break-all">{scannedData}</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors"
                    >
                      Scan Again
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(scannedData);
                        toast.success("Copied to clipboard!");
                      }}
                      className="flex-1 bg-white text-gray-950 hover:bg-white/90 font-semibold py-3 rounded-xl transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col overflow-hidden touch-none">
            {/* Camera viewfinder - full screen */}
            <div className="relative flex-1 bg-black overflow-hidden touch-none">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover touch-none"
                playsInline
                muted
              />

              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-72 h-72">
                  {/* Corner borders */}
                  <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-white rounded-tl-2xl" />
                  <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-white rounded-tr-2xl" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-white rounded-bl-2xl" />
                  <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-white rounded-br-2xl" />

                  {/* Scanning line animation */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent animate-scan" />
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(6400%);
          }
        }
        :global(.animate-scan) {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function ScannerPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen flex items-center justify-center bg-transparent">
        <BackgroundGradient />
        <div className="relative z-10 text-white/40">Loading...</div>
      </div>
    }>
      <ScannerPageContent />
    </Suspense>
  );
}

