// Tactical radar / intel background — pure CSS, no JS, SSR-safe.
// Concentric rings + grid + a slowly rotating sweep + a few ping blips.

const RING = "rgba(157, 160, 121, 0.10)";
const SWEEP = "rgba(157, 160, 121, 0.18)";

const blips = [
  { top: "32%", left: "61%", delay: "0s" },
  { top: "57%", left: "38%", delay: "1.4s" },
  { top: "45%", left: "72%", delay: "2.6s" },
  { top: "68%", left: "55%", delay: "3.7s" },
];

export function RadarBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* faint tactical grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(157,160,121,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(157,160,121,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* radar dish centered, fades out at edges */}
      <div
        className="absolute left-1/2 top-1/2 aspect-square w-[140vh] -translate-x-1/2 -translate-y-1/2"
        style={{
          maskImage: "radial-gradient(circle, #000 55%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(circle, #000 55%, transparent 72%)",
        }}
      >
        {/* concentric rings + crosshair */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            backgroundImage: `repeating-radial-gradient(circle, ${RING} 0 1px, transparent 1px 9%), linear-gradient(${RING}, ${RING}), linear-gradient(90deg, ${RING}, ${RING})`,
            backgroundSize: "100% 100%, 1px 100%, 100% 1px",
            backgroundPosition: "center, center, center",
            backgroundRepeat: "no-repeat",
          }}
        />
        {/* rotating sweep wedge */}
        <div
          className="absolute inset-0 rounded-full motion-safe:animate-[radar-sweep_7s_linear_infinite]"
          style={{
            background: `conic-gradient(from 0deg, ${SWEEP} 0deg, transparent 42deg)`,
          }}
        />
      </div>
      {/* ping blips */}
      {blips.map((b, i) => (
        <span
          key={i}
          className="absolute h-2 w-2 rounded-full motion-safe:animate-[blip_4s_ease-out_infinite]"
          style={{
            top: b.top,
            left: b.left,
            animationDelay: b.delay,
            background: "rgba(157,160,121,0.55)",
            boxShadow: "0 0 8px rgba(157,160,121,0.6)",
          }}
        />
      ))}
    </div>
  );
}
