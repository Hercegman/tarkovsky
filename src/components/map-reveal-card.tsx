import Link from "next/link";
import Image from "next/image";

/**
 * Map card: shows the artistic map banner by default, and crossfades to the
 * interactive map on hover (pure CSS).
 */
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
        {/* Art banner — always visible, fades out on hover. */}
        <Image
          src={`/maps/banner/${id}.webp`}
          alt={name}
          fill
          sizes="(max-width: 640px) 50vw, 320px"
          className="object-cover transition-opacity duration-500 ease-out group-hover:opacity-0"
          unoptimized
        />
        {/* Interactive map — revealed on hover. */}
        <Image
          src={`/maps/thumb/${id}.webp`}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, 320px"
          className="object-cover opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
          unoptimized
        />
        {/* Readability scrim + label. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
          <span className="font-display text-base font-semibold text-white drop-shadow">
            {name}
          </span>
          <span className="rounded bg-black/40 px-1.5 py-0.5 text-xs text-[var(--gold-hi)] backdrop-blur-sm">
            {count} quests
          </span>
        </div>
      </div>
    </Link>
  );
}
