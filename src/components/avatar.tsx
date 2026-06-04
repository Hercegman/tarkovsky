import Image from "next/image";

/** Profile icon: a trader portrait (by id) or an initial fallback. */
export function Avatar({
  avatar,
  name,
  size = 40,
  className = "",
}: {
  avatar: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}) {
  const dim = { width: size, height: size };
  if (avatar) {
    return (
      <span
        style={dim}
        className={`relative inline-block overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)] ${className}`}
      >
        <Image
          src={`/traders/${avatar}.webp`}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover object-top"
          unoptimized
        />
      </span>
    );
  }
  return (
    <span
      style={dim}
      className={`inline-flex items-center justify-center rounded-full border border-[var(--gold-dim)] bg-[var(--surface-2)] font-bold text-[var(--gold)] ${className}`}
    >
      {name?.[0]?.toUpperCase() ?? "?"}
    </span>
  );
}
