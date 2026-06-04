"use client";

import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import type { ReactNode, MouseEvent } from "react";

/**
 * Card that lifts on hover and shows a gold spotlight following the cursor.
 * Uses motion values + a CSS mask so the spotlight doesn't cause re-renders.
 */
export function AnimatedCard({
  children,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const background = useMotionTemplate`radial-gradient(220px circle at ${mx}px ${my}px, rgba(200,160,77,0.12), transparent 70%)`;

  function onMove(e: MouseEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  }

  const MotionTag = as === "li" ? motion.li : motion.div;

  return (
    <MotionTag
      onMouseMove={onMove}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 250, damping: 20 }}
      className={`group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--gold-dim)] ${className}`}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background }}
      />
      <div className="relative">{children}</div>
    </MotionTag>
  );
}
