export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-xs text-[var(--muted)]">
      <div className="mx-auto max-w-6xl space-y-2">
        <p>
          All data is sourced <span className="text-[var(--gold)]">exclusively</span>{" "}
          from the official{" "}
          <a
            href="https://escapefromtarkov.fandom.com"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--gold)] hover:underline"
          >
            Escape from Tarkov Wiki
          </a>{" "}
          (Fandom) — no game-mined data and no third-party APIs. Licensed under{" "}
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/3.0/"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--gold)] hover:underline"
          >
            CC BY-NC-SA
          </a>
          . This is a free, non-commercial fan project and is not affiliated with
          or endorsed by Battlestate Games.
        </p>
        <p>Escape from Tarkov is a trademark of Battlestate Games.</p>
      </div>
    </footer>
  );
}
