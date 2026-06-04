"use client";

import dynamic from "next/dynamic";

// R3F needs the browser; load only on the client.
const ParticleHero = dynamic(() => import("./particle-hero"), { ssr: false });

export function HeroCanvas() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <ParticleHero />
    </div>
  );
}
