// app/components/BackgroundGradient.tsx
"use client";

import { memo, useId } from "react";
import clsx from "clsx";

type Props = {
  className?: string;         // extra classes for the wrapper
  asOverlay?: boolean;        // if true, pointer-events are disabled
};

function BackgroundGradientBase({ className, asOverlay = true }: Props) {
  const id = useId(); // ensure unique <defs> IDs per instance

  const a = `home-dark_svg__a-${id}`;
  const b = `home-dark_svg__b-${id}`;
  const c = `home-dark_svg__c-${id}`;
  const d = `home-dark_svg__d-${id}`;
  const e = `home-dark_svg__e-${id}`;
  const f = `home-dark_svg__f-${id}`;
  const g = `home-dark_svg__g-${id}`;

  return (
    <div
      className={clsx(
        "absolute inset-0 -z-10 overflow-hidden", // full-bleed, behind content
        asOverlay && "pointer-events-none",
        className
      )}
      aria-hidden="true"
    >
      {/* SVG Gradient Background */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 1045"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <g opacity="0.6">
          <g filter={`url(#${a})`}>
            <path
              fill={`url(#${b})`}
              d="M574.024-14.844 1554.4-21c49.73 49.656-256.96 249.617 134.98 448.139 255.21 129.271 95.36 450.601-384.16 606.961-515.216 167.99-1728.23 153.95-1771.055 183.45l-.898 2.45c-.553-.85-.242-1.67.898-2.45L-12.068-21z"
            />
          </g>
          <g filter={`url(#${c})`}>
            <path
              fill={`url(#${d})`}
              d="M-276.018-43.977 824.573-53c55.828 72.784 331.237 414.417 0 733.555-370.851 357.305-490.48 60.453-1232.183 731.755-345.632 312.82-989.25 307.15-1034.83 346.71l-1.96 6.98c-1.24-2.5-.54-4.81 1.96-6.98L-933.98-53z"
            />
          </g>
          <g filter={`url(#${e})`}>
            <path
              fill={`url(#${f})`}
              d="M259.126 545.017C515.61 303.398 250.814 55.145 86.356-38.779L-613.63-74-692 1526.81c265.983 120.93 748.077 280.72 548.59-47.54-249.359-410.33 81.932-632.229 402.536-934.253"
            />
          </g>

          {/* vertical fade overlay */}
          <rect fill={`url(#${g})`} x="0" y="0" width="1440" height="1045" />
        </g>

        <defs>
          <linearGradient id={b} x1="1405.21" x2="1340.51" y1="-27.156" y2="959.445" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F8B8BC" />
            <stop offset="0.338" stopColor="#FA9898" />
            <stop offset="1" stopColor="#BEE4BE" />
          </linearGradient>

          <linearGradient id={d} x1="657.092" x2="533.655" y1="-62.023" y2="1379.74" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FEF1C3" />
            <stop offset="0.338" stopColor="#FBAF59" />
            <stop offset="1" stopColor="#F86A1A" />
          </linearGradient>

          <linearGradient id={f} x1="-693.781" x2="194.39" y1="497.468" y2="1081.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00E0FF" />
            <stop offset="1" stopColor="#F0C" />
          </linearGradient>

          <linearGradient id={g} x1="720" x2="720" y1="0" y2="1045" gradientUnits="userSpaceOnUse">
            <stop offset="0.3" stopOpacity="0" />
            <stop offset="1" stopOpacity="0.6" />
          </linearGradient>

          <filter id={a} x="-667" y="-221" width="2677" height="1641" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur stdDeviation="100" result="effect1_foregroundBlur_11573_201206" />
          </filter>

          <filter id={c} x="-1645" y="-253" width="2830" height="2219" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur stdDeviation="100" result="effect1_foregroundBlur_11573_201206" />
          </filter>

          <filter id={e} x="-892" y="-274" width="1458" height="2148" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur stdDeviation="100" result="effect1_foregroundBlur_11573_201206" />
          </filter>
        </defs>
      </svg>

      {/* Dark overlay with blur and grain */}
      <div
        className="absolute inset-0 backdrop-blur-3xl bg-gray-950/60"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

export const BackgroundGradient = memo(BackgroundGradientBase);
