import Link from "next/link";
import { HeaderAuth } from "./header-auth";
import { TradersMenu } from "./traders-menu";
import { SoundToggle } from "./sound-toggle";
import { getTraders } from "@/lib/data";

const nav = [
  { href: "/quests", label: "Quests" },
  { href: "/maps", label: "Maps" },
  { href: "/ammo", label: "Ammo" },
  { href: "/gun-builder", label: "Gun Builder" },
];

export async function SiteHeader() {
  const traders = await getTraders();
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-widest text-[var(--gold)]">
            TARKOVSKY
          </span>
          <span className="hidden text-xs uppercase tracking-wider text-[var(--muted)] sm:inline">
            Quest Wiki
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded px-3 py-1.5 text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--gold)]"
            >
              {n.label}
            </Link>
          ))}
          <TradersMenu traders={traders} />
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <SoundToggle />
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}
