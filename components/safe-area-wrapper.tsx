"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect, useState } from "react";

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function SafeAreaWrapper({ children }: { children: React.ReactNode }) {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });
  const [isInMiniApp, setIsInMiniApp] = useState(false);

  useEffect(() => {
    const loadSafeAreaInsets = async () => {
      try {
        const miniAppStatus = await sdk.isInMiniApp();
        setIsInMiniApp(miniAppStatus);

        if (miniAppStatus) {
          const context = await sdk.context;
          if (context.client.safeAreaInsets) {
            setInsets(context.client.safeAreaInsets);
          }
        }
      } catch (error) {
        console.error("Error loading safe area insets:", error);
      }
    };

    loadSafeAreaInsets();
  }, []);

  return (
    <div
      style={{
        paddingTop: `${insets.top}px`,
        paddingBottom: `${insets.bottom}px`,
        paddingLeft: `${insets.left}px`,
        paddingRight: `${insets.right}px`,
        minHeight: "100vh",
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}
