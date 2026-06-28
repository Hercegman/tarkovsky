"use client";

export type BoardTool = "pan" | "pen" | "arrow" | "x" | "circle" | "eraser";

const COLORS = ["#e3c170", "#ff5252", "#4fc3f7", "#69f0ae", "#ffffff", "#101010"];
const WIDTHS = [2, 4, 6, 10];

const TOOLS: { id: BoardTool; label: string; icon: string }[] = [
  { id: "pan", label: "Move / zoom the map", icon: "✋" },
  { id: "pen", label: "Draw freehand", icon: "✏️" },
  { id: "arrow", label: "Draw an arrow", icon: "↗" },
  { id: "x", label: "Mark an X", icon: "✕" },
  { id: "circle", label: "Draw a circle", icon: "◯" },
  { id: "eraser", label: "Erase strokes", icon: "🧽" },
];

export function SessionToolbar({
  tool,
  setTool,
  color,
  setColor,
  width,
  setWidth,
  onUndo,
  canUndo,
  onClear,
}: {
  tool: BoardTool;
  setTool: (t: BoardTool) => void;
  color: string;
  setColor: (c: string) => void;
  width: number;
  setWidth: (w: number) => void;
  onUndo: () => void;
  canUndo: boolean;
  onClear: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-[1100] flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 p-2 backdrop-blur">
      {/* Tools */}
      <div className="flex items-center gap-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.label}
            aria-pressed={tool === t.id}
            onClick={() => setTool(t.id)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors ${
              tool === t.id
                ? "border-[var(--gold)] bg-[var(--gold)]/20 text-[var(--gold)]"
                : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <span className="mx-1 h-6 w-px bg-[var(--border)]" />

      {/* Colors */}
      <div className="flex items-center gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={`Color ${c}`}
            onClick={() => setColor(c)}
            className={`h-6 w-6 rounded-full border-2 transition-transform ${
              color === c
                ? "scale-110 border-[var(--foreground)]"
                : "border-transparent hover:scale-105"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <span className="mx-1 h-6 w-px bg-[var(--border)]" />

      {/* Stroke width */}
      <div className="flex items-center gap-1">
        {WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            title={`Width ${w}px`}
            aria-pressed={width === w}
            onClick={() => setWidth(w)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              width === w
                ? "border-[var(--gold)] bg-[var(--gold)]/20"
                : "border-[var(--border)] hover:bg-[var(--surface-2)]"
            }`}
          >
            <span
              className="rounded-full bg-[var(--foreground)]"
              style={{ width: w + 2, height: w + 2 }}
            />
          </button>
        ))}
      </div>

      <span className="mx-1 h-6 w-px bg-[var(--border)]" />

      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo last change"
        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs transition-colors hover:bg-[var(--surface-2)] disabled:opacity-40"
      >
        ↶ Undo
      </button>

      <button
        type="button"
        onClick={onClear}
        title="Clear everything"
        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] transition-colors hover:border-[var(--danger,#ff6b6b)] hover:text-[var(--danger,#ff6b6b)]"
      >
        Clear
      </button>
    </div>
  );
}
