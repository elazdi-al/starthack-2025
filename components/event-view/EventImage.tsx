"use client";

import Image from "next/image";

interface EventImageProps {
  imageUri: string | null;
  title: string;
}

export function EventImage({ imageUri, title }: EventImageProps) {
  return (
    <div className="relative w-full lg:w-[45%] aspect-[4/3] rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
      {imageUri ? (
        <Image
          src={imageUri}
          alt={`${title} cover art`}
          fill
          unoptimized
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="object-cover"
          priority
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-white/10 via-white/5 to-transparent">
          <span className="text-white/50 text-sm">No cover image</span>
          <span className="text-white/30 text-xs">
            Add one during event creation
          </span>
        </div>
      )}
    </div>
  );
}
