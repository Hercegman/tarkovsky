// Approximate weapon stat calculation from wiki modifiers.
// ergonomics = base + Σ ergo; recoil = base × (1 + Σ recoil% / 100);
// MOA = base + Σ accuracy; weight = base + Σ weight.
import type { Weapon, Attachment } from "./types";

export interface ComputedStats {
  ergonomics: number;
  recoilVertical: number;
  recoilHorizontal: number;
  moa: number;
  weight: number;
}

const round = (n: number, d = 0) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

export function computeStats(
  weapon: Weapon,
  attachments: Attachment[],
): ComputedStats {
  let ergo = weapon.ergonomics ?? 0;
  let recoilPct = 0;
  let moa = weapon.moa ?? 0;
  let weight = weapon.weight ?? 0;

  for (const a of attachments) {
    ergo += a.ergo ?? 0;
    recoilPct += a.recoil ?? 0;
    moa += a.accuracy ?? 0;
    weight += a.weight ?? 0;
  }

  const factor = 1 + recoilPct / 100;
  return {
    ergonomics: round(ergo, 1),
    recoilVertical: round((weapon.recoilVertical ?? 0) * factor),
    recoilHorizontal: round((weapon.recoilHorizontal ?? 0) * factor),
    moa: round(moa, 2),
    weight: round(weight, 3),
  };
}
