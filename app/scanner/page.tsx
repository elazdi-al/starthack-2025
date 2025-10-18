"use client";

import { BackgroundGradient } from "@/components/BackgroundGradient";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useAuthCheck } from "@/lib/store/authStore";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle, Scan, Warning } from "phosphor-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";

interface VerificationResult {
  success: boolean;
  valid: boolean;
  error?: string;
  message: string;
  details?: {
    tokenId: string;
    eventId: string;
    eventName?: string;
    currentOwner?: string;
    originalHolder?: string;
    ownerChanged?: boolean;
  };
}

export default function ScannerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, hasHydrated } = useAuthCheck();
  const { address: walletAddress } = useAccount();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get eventId from URL params if present
  const eventId = searchParams.get('eventId');

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
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
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
            verifyTicket(code.data, eventId, walletAddress);
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
  }, [isScanning, eventId, walletAddress]);

  const verifyTicket = async (qrData: string, eventIdParam: string, owner: string) => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/tickets/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrData,
          eventId: eventIdParam,
          eventOwner: owner,
        }),
      });

      const result: VerificationResult = await response.json();
      setVerificationResult(result);

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
    } catch (err) {
      console.error('Verification error:', err);
      setVerificationResult({
        success: false,
        valid: false,
        message: 'Failed to verify ticket',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      toast.error("Verification Failed", {
        description: "Could not verify ticket. Please try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setScannedData(null);
    setVerificationResult(null);
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
              verifyTicket(code.data, eventId, walletAddress);
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

  return (
    <div className="relative h-screen flex flex-col bg-black overflow-hidden">
      <BackgroundGradient />

      <TopBar title="Scan QR Code" showTitle={true} showBackButton={true} backPath="/tickets" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
        {error ? (
          <div className="w-full h-full flex items-center justify-center px-6">
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
          <div className="w-full h-full flex items-center justify-center px-6">
            <div className="max-w-md w-full space-y-4">
              {isVerifying ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white text-lg font-semibold">Verifying Ticket...</p>
                  <p className="text-white/60 text-sm mt-2">Checking blockchain records</p>
                </div>
              ) : verificationResult ? (
                <div className={`${
                  verificationResult.valid 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                } border rounded-2xl p-6`}>
                  {verificationResult.valid ? (
                    <CheckCircle size={64} weight="fill" className="text-green-400 mx-auto mb-4" />
                  ) : (
                    <XCircle size={64} weight="fill" className="text-red-400 mx-auto mb-4" />
                  )}
                  
                  <p className={`${
                    verificationResult.valid ? 'text-green-400' : 'text-red-400'
                  } text-2xl font-bold mb-2 text-center`}>
                    {verificationResult.valid ? 'VALID TICKET ✓' : 'INVALID TICKET ✗'}
                  </p>
                  
                  <p className="text-white/80 text-center mb-6">
                    {verificationResult.message}
                  </p>

                  {verificationResult.details && (
                    <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-2 text-sm">
                      {verificationResult.details.eventName && (
                        <div>
                          <span className="text-white/50">Event: </span>
                          <span className="text-white font-semibold">{verificationResult.details.eventName}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-white/50">Token ID: </span>
                        <span className="text-white font-mono">{verificationResult.details.tokenId}</span>
                      </div>
                      {verificationResult.details.currentOwner && (
                        <div>
                          <span className="text-white/50">Owner: </span>
                          <span className="text-white font-mono text-xs">
                            {verificationResult.details.currentOwner.slice(0, 6)}...
                            {verificationResult.details.currentOwner.slice(-4)}
                          </span>
                        </div>
                      )}
                      {verificationResult.details.ownerChanged && (
                        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                          <Warning size={16} className="text-yellow-400" />
                          <span className="text-yellow-400 text-xs">Ticket was resold</span>
                        </div>
                      )}
                    </div>
                  )}

                  {!verificationResult.valid && verificationResult.error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-6">
                      <p className="text-red-300 text-xs font-semibold mb-1">Error:</p>
                      <p className="text-red-200 text-xs">{verificationResult.error}</p>
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
          <div className="w-full h-full flex flex-col">
            {/* Camera viewfinder - full screen */}
            <div className="relative flex-1 bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
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

