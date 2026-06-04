"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Faint fixed backdrop that crossfades through a set of images on a timer.
 * Sits behind the page content (which should be z-10+); the page colour still
 * dominates, with the images barely showing through.
 */
export function CyclingBackdrop({
  images,
  intervalMs = 4000,
  opacity = 0.1,
  grayscale = false,
}: {
  images: string[];
  intervalMs?: number;
  opacity?: number;
  grayscale?: boolean;
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(
      () => setI((p) => (p + 1) % images.length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [images.length, intervalMs]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      {images.map((src, idx) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          sizes="100vw"
          unoptimized
          priority={idx === 0}
          className={`object-cover object-center blur-md transition-opacity duration-1000 ease-in-out ${
            grayscale ? "grayscale" : ""
          }`}
          style={{ opacity: idx === i ? opacity : 0 }}
        />
      ))}
    </div>
  );
}
