import Image from "next/image";
import type { ItemRef } from "@/lib/types";

/** Grid of items referenced by a quest — icon + name. */
export function ItemGallery({ items }: { items: ItemRef[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((it) => (
        <div
          key={it.name}
          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
            {it.image ? (
              <Image
                src={it.image}
                alt={it.name}
                fill
                sizes="40px"
                className="object-contain p-0.5"
                unoptimized
              />
            ) : (
              <span className="text-[10px] text-[var(--muted)]">?</span>
            )}
          </span>
          <span className="text-xs leading-tight text-[var(--foreground)]">
            {it.name}
          </span>
        </div>
      ))}
    </div>
  );
}
