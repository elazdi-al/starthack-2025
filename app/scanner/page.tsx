"use client";

import { BackgroundGradient } from "@/components/BackgroundGradient";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useAuthCheck } from "@/lib/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle, Scan } from "phosphor-react";
import { toast } from "sonner";

export default function ScannerPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthCheck();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
          
          toast.success("QR Code Scanned!", {
            description: "Code detected successfully"
          });
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
  }, [isScanning]);

  const handleReset = () => {
    setScannedData(null);
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
            
            toast.success("QR Code Scanned!");
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
    <div className="relative min-h-screen flex flex-col bg-transparent overflow-hidden pb-24 md:pb-6">
      <BackgroundGradient />

      <TopBar title="Scan QR Code" showTitle={true} showBackButton={true} backPath="/tickets" />
      <BottomNav />

      <div className="relative z-10 flex-1 px-6 flex flex-col items-center justify-center">
        {error ? (
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
        ) : scannedData ? (
          <div className="max-w-md w-full space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
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
          </div>
        ) : (
          <div className="max-w-md w-full space-y-4">
            {/* Camera viewfinder */}
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-square">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-64 h-64">
                  {/* Corner borders */}
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-2xl" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-2xl" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-2xl" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-2xl" />
                  
                  {/* Scanning line animation */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent animate-scan" />
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Instructions */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Scan size={24} weight="regular" className="text-white/60 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-semibold mb-1">Position QR Code</p>
                  <p className="text-white/60 text-xs">
                    Hold your device steady and center the QR code within the frame.
                  </p>
                </div>
              </div>
            </div>
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

