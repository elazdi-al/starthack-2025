"use client";

import { useComposeCast } from '@coinbase/onchainkit/minikit';
import { minikitConfig } from "../../minikit.config";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";

export default function Success() {
  const { composeCastAsync } = useComposeCast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authInfo, setAuthInfo] = useState<{ address?: string } | null>(null);

  useEffect(() => {
    // Check if user authenticated via Base (stored in localStorage)
    if (typeof window !== 'undefined') {
      const baseAddress = localStorage.getItem('base_auth_address');
      if (baseAddress) {
        setAuthInfo({ address: baseAddress });
      }
    }
  }, []);
  
  const handleShare = async () => {
    try {
      const text = `Yay! I just joined the waitlist for ${minikitConfig.miniapp.name.toUpperCase()}! `;
      
      const result = await composeCastAsync({
        text: text,
        embeds: [process.env.NEXT_PUBLIC_URL || ""]
      });

      // result.cast can be null if user cancels
      if (result?.cast) {
        console.log("Cast created successfully:", result.cast.hash);
      } else {
        console.log("User cancelled the cast");
      }
    } catch (error) {
      console.error("Error sharing cast:", error);
    }
  };

  const handleClose = () => {
    router.push('/');
  };

  return (
    <div className={styles.container}>
      <button className={styles.closeButton} type="button" onClick={handleClose}>
        ✕
      </button>
      
      <div className={styles.content}>
        <div className={styles.successMessage}>
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-24 h-24 text-green-500" strokeWidth={2} />
          </div>
          
          <h1 className={styles.title}>Welcome to the {minikitConfig.miniapp.name.toUpperCase()}!</h1>
          
          <p className={styles.subtitle}>
            You&apos;re in! We&apos;ll notify you as soon as we launch.<br />
            Get ready to experience the future of onchain marketing.
          </p>

          {authInfo?.address && (
            <p className="text-sm text-muted-foreground mt-4">
              Authenticated with Base: {authInfo.address.slice(0, 6)}...{authInfo.address.slice(-4)}
            </p>
          )}

          <button onClick={handleShare} className={styles.shareButton}>
            SHARE
          </button>
        </div>
      </div>
    </div>
  );
}
