import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import { minikitConfig } from "../minikit.config";
import { RootProvider } from "./rootProvider";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { SafeAreaWrapper } from "@/components/layout/SafeAreaWrapper";
import { getConfig } from "@/config";
import { cookieToInitialState } from "wagmi";
import { headers } from "next/headers";
import { Providers } from "./Providers";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata(): Promise<Metadata> {
  const ROOT_URL = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';

  return {
    title: minikitConfig.miniapp.name,
    description: minikitConfig.miniapp.description,
    other: {
      "fc:miniapp": JSON.stringify({
        version: 'next',
        imageUrl: minikitConfig.miniapp.heroImageUrl || `${ROOT_URL}/hero.png`,
        button: {
          title: `Launch ${minikitConfig.miniapp.name}`,
          action: {
            type: 'launch_miniapp',
            name: minikitConfig.miniapp.name,
            url: ROOT_URL,
            splashImageUrl: minikitConfig.miniapp.splashImageUrl || `${ROOT_URL}/hero.png`,
            splashBackgroundColor: minikitConfig.miniapp.splashBackgroundColor || '#000000',
          },
        },
      }),
    },
  };
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialState = cookieToInitialState(
    getConfig(),
    (await headers()).get('cookie')
  )
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Prevent zoom on double tap
              let lastTouchEnd = 0;
              document.addEventListener('touchend', function(event) {
                const now = Date.now();
                if (now - lastTouchEnd <= 300) {
                  event.preventDefault();
                }
                lastTouchEnd = now;
              }, { passive: false });

              // Prevent zoom with gestures
              document.addEventListener('gesturestart', function(e) {
                e.preventDefault();
              }, { passive: false });

              // Remove URL hash on load and prevent hash changes
              if (window.location.hash) {
                history.replaceState(null, '', window.location.pathname + window.location.search);
              }
              window.addEventListener('hashchange', function() {
                history.replaceState(null, '', window.location.pathname + window.location.search);
              });
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${sourceCodePro.variable}`}>
        <Providers initialState={initialState}>
          <RootProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <SafeAreaWrapper>{children}</SafeAreaWrapper>
              <Toaster />
            </ThemeProvider>
          </RootProvider>
        </Providers>
      </body>
    </html>
  );
}
