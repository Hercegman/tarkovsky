"use client";

import { useEffect, useState } from "react";

interface ProgressState {
  completed: Set<string> | null; // null while loading / anon
  anon: boolean;
}

/** Fetch the signed-in user's completed quest ids (once per mount). */
export function useProgress(): ProgressState {
  const [completed, setCompleted] = useState<Set<string> | null>(null);
  const [anon, setAnon] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/progress", { cache: "no-store" })
      .then(async (r) => {
        if (!active) return;
        if (r.status === 401 || !r.ok) {
          setAnon(true);
          return;
        }
        const data: { completed: string[] } = await r.json();
        setCompleted(new Set(data.completed));
      })
      .catch(() => active && setAnon(true));
    return () => {
      active = false;
    };
  }, []);

  return { completed, anon };
}
