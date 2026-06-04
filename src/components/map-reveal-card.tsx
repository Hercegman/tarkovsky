import Link from "next/link";
import Image from "next/image";

/** Map card that reveals the map image on hover (pure CSS). */
export function MapRevealCard({
  id,
  name,
  count,
}: {
  id: string;
  name: string;
  count: number;
}) {
  return (
    <Link href={`/maps/${id}`}>
      <div className="group relative aspect-[16/10] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--gold-dim)]">
        {/* Hidden map image, revealed on hover. */}
        <Image
          src={`/maps/thumb/${id}.webp`}
          alt={name}
          fill
          sizes="(max-width: 640px) 50vw, 300px"
          className="object-cover opacity-0 scale-110 blur-[1px] grayscale transition-all duration-500 ease-out group-hover:opacity-100 group-hover:scale-100 group-hover:blur-0 group-hover:grayscale-0"
          unoptimized
        />
        {/* Readability scrim. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/70 to-[var(--surface)]/30 transition-opacity duration-500 group-hover:from-[var(--surface)]/90 group-hover:via-transparent group-hover:to-transparent" />
        {/* Label. */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
          <span className="font-display text-base font-semibold text-[var(--foreground)]">
            {name}
          </span>
          <span className="text-xs text-[var(--muted)] transition-colors group-hover:text-[var(--gold)]">
            {count} quests
          </span>
        </div>
      </div>
    </Link>
  );
}
