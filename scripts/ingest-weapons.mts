/*
 * Project Tarkovsky — gun builder data (approximate, wiki-only).
 *
 * For a curated set of weapons, pulls base stats + the Mods slots (compatible
 * attachments) from the EFT Wiki, and each attachment's stat modifiers, into:
 *   content/weapons/<id>.json, content/attachments.json, public/weapons/<id>.<ext>
 *
 * Source: EFT Wiki (CC BY-NC-SA). Stats are approximate (the wiki is the only
 * source we use; cross-slot conflicts and some mods are not modelled).
 *
 * Usage: node scripts/ingest-weapons.mts
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const UA =
  "ProjectTarkovsky/1.0 (https://github.com/Hercegman/tarkovsky; grizelj.roko@gmail.com)";
const API = "https://escapefromtarkov.fandom.com/api.php";
const ROOT = process.cwd();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Curated MVP weapon set (wiki page titles).
const WEAPONS = [
  "ADAR 2-15 5.56x45 carbine",
  "Kalashnikov AKS-74U 5.45x39 assault rifle",
  "Kalashnikov AK-74M 5.45x39 assault rifle",
  "Mosin 7.62x54R bolt-action rifle (Infantry)",
  "Kalashnikov AKS-74UB 5.45x39 assault rifle",
  "TOZ KS-23M 23x75mm pump-action shotgun",
  "Makarov PM 9x18PM pistol",
];

async function api(p: Record<string, string>): Promise<any> {
  const url = new URL(API);
  url.search = new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...p }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
function chunk<T>(a: T[], n: number): T[][] {
  const o: T[][] = [];
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n));
  return o;
}
const slug = (s: string) =>
  s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const extFor = (b: Uint8Array) =>
  b[0] === 0x89 ? "png" : b[0] === 0xff ? "jpg" : b[0] === 0x52 ? "webp" : "png";

function ibField(wt: string, key: string): string | null {
  const m = wt.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n]*)`, "i"));
  return m ? m[1].trim() : null;
}
const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").trim();
function num(s: string | null): number | null {
  if (!s) return null;
  const m = stripTags(s).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}
function fileField(wt: string, key: string): string | null {
  const v = ibField(wt, key);
  if (!v) return null;
  return v.replace(/\[\[|\]\]/g, "").replace(/^File:/i, "").split("|")[0].trim() || null;
}

interface Slot {
  name: string;
  allowed: string[]; // attachment slugs
}

/** The rendered Mods section, bounded by the next top-level heading. */
function modsRegion(html: string): string {
  const i = html.search(/id="Mods"/);
  if (i < 0) return "";
  const after = html.slice(i + 5);
  const nh = after.search(/<h2[ >]/);
  return nh >= 0 ? html.slice(i, i + 5 + nh) : html.slice(i, i + 40000);
}

/** Slot names, in order, from the Mods tabber wikitext (`Name=` ... `|-|Name=`). */
function slotNames(wt: string): string[] {
  const sec = wt.match(/==\s*Mods\s*==([\s\S]*?)(?=\n==[^=]|$)/i)?.[1] || "";
  const tab = sec.match(/<tabber>([\s\S]*?)<\/tabber>/i)?.[1] ?? sec;
  return tab.split(/\|-\|/).map((b) => {
    const m = b.match(/^\s*([^=\n|{}]+?)\s*=/);
    return m ? m[1].trim() : "";
  });
}

/** Parse the Mods tabber → slots with compatible attachment pages. */
function parseMods(html: string, wt: string): { slots: Slot[]; pages: Map<string, { name: string; icon: string | null }> } {
  const pages = new Map<string, { name: string; icon: string | null }>();
  const slots: Slot[] = [];
  const region = modsRegion(html);
  if (!region) return { slots, pages };
  const names = slotNames(wt);
  const contents = region.split("wds-tab__content").slice(1);
  for (let i = 0; i < contents.length; i++) {
    const block = contents[i];
    const allowed: string[] = [];
    const re = /<a href="\/wiki\/([^"#:]+)"[^>]*?(?:title="([^"]+)")?[^>]*>(?:<img[^>]*?(?:data-src|src)="([^"]+)")?/g;
    let m: RegExpExecArray | null;
    const seen = new Set<string>();
    while ((m = re.exec(block))) {
      const page = decodeURIComponent(m[1]).replace(/_/g, " ");
      if (/^(Weapon mods|Category|File|Special|Template|Help)/i.test(page)) continue;
      const s = slug(page);
      if (seen.has(s)) continue;
      seen.add(s);
      allowed.push(s);
      if (!pages.has(page)) pages.set(page, { name: (m[2] || page).trim(), icon: m[3] || null });
    }
    if (allowed.length) slots.push({ name: (names[i] || `Slot ${i + 1}`).trim(), allowed });
  }
  return { slots, pages };
}

async function main() {
  await mkdir(path.join(ROOT, "content", "weapons"), { recursive: true });
  await mkdir(path.join(ROOT, "public", "weapons"), { recursive: true });

  const attachmentPages = new Map<string, { name: string; icon: string | null }>();
  const weapons: any[] = [];
  const imageJobs = new Map<string, string>(); // local slug -> File title (no File:)

  for (const title of WEAPONS) {
    try {
      const wt = (await api({ action: "parse", page: title, prop: "wikitext" })).parse?.wikitext as string | undefined;
      const html = (await api({ action: "parse", page: title, prop: "text" })).parse?.text as string | undefined;
      if (!wt || !html) {
        console.warn(`  ! ${title}: no content`);
        continue;
      }
      const rec = ibField(wt, "Weaprecoil") || "";
      const recV = num((rec.match(/Vertical:\s*([^<|]+)/i) || [])[1] || null);
      const recH = num((rec.match(/Horizontal:\s*([^<|]+)/i) || [])[1] || null);
      const { slots, pages } = parseMods(html, wt);
      for (const [p, info] of pages) attachmentPages.set(p, info);

      const id = slug(title);
      const imgFile = fileField(wt, "image");
      if (imgFile) imageJobs.set(`w-${id}`, imgFile);
      weapons.push({
        id,
        name: title,
        page: title,
        image: imgFile ? `/weapons/${id}.IMG` : null, // ext filled after download
        ergonomics: num(ibField(wt, "ergonomics")),
        recoilVertical: recV,
        recoilHorizontal: recH,
        moa: num(ibField(wt, "MOA")),
        weight: num(ibField(wt, "weight")),
        fireRate: num(ibField(wt, "rof")),
        caliber: stripTags(ibField(wt, "caliber") || "").replace(/\[\[|\]\]/g, "") || null,
        slots,
        source: { url: `https://escapefromtarkov.fandom.com/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`, license: "CC BY-NC-SA", wiki: "Escape from Tarkov Wiki" },
      });
      console.log(`  ${title}: ${slots.length} slots, ${pages.size} mods`);
      await sleep(900);
    } catch (e) {
      console.warn(`  ! ${title}: ${(e as Error).message}`);
    }
  }

  // Fetch attachment infoboxes (batched).
  console.log(`\nFetching ${attachmentPages.size} attachment infoboxes…`);
  const attachments: Record<string, any> = {};
  const pageList = [...attachmentPages.keys()];
  for (const part of chunk(pageList, 50)) {
    const data = await api({ action: "query", prop: "revisions", rvprop: "content", rvslots: "main", titles: part.join("|") });
    for (const p of data.query?.pages ?? []) {
      if (p.missing) continue;
      const wt = p.revisions?.[0]?.slots?.main?.content as string | undefined;
      if (!wt) continue;
      const id = slug(p.title);
      const iconFile = fileField(wt, "icon") || fileField(wt, "image");
      if (iconFile) imageJobs.set(`a-${id}`, iconFile);
      attachments[id] = {
        id,
        name: p.title,
        image: iconFile ? `/weapons/a-${id}.IMG` : null,
        ergo: num(ibField(wt, "ergonomics")) ?? 0,
        recoil: num(ibField(wt, "recoil")) ?? 0,
        accuracy: num(ibField(wt, "accuracy")) ?? 0,
        weight: num(ibField(wt, "weight")) ?? 0,
        type:
          ((ibField(wt, "type") || "").replace(/\[\[|\]\]/g, "").split("|").pop() || "").trim() ||
          null,
      };
    }
    await sleep(700);
  }

  // Resolve + download images (batched imageinfo).
  console.log(`\nDownloading ${imageJobs.size} images…`);
  const jobs = [...imageJobs.entries()];
  for (const part of chunk(jobs, 50)) {
    const titles = part.map(([, fn]) => `File:${fn}`).join("|");
    const info = await api({ action: "query", titles, prop: "imageinfo", iiprop: "url", iiurlwidth: "160" });
    const norm = (s: string) => s.replace(/_/g, " ").toLowerCase();
    const urlByFile = new Map<string, string>();
    for (const p of info.query?.pages ?? []) {
      const u = p.imageinfo?.[0]?.thumburl ?? p.imageinfo?.[0]?.url;
      if (u) urlByFile.set(norm(p.title), u);
    }
    for (const [localKey, fn] of part) {
      const u = urlByFile.get(norm(`File:${fn}`));
      if (!u) continue;
      try {
        const buf = new Uint8Array(await (await fetch(u, { headers: { "User-Agent": UA } })).arrayBuffer());
        const ext = extFor(buf);
        const fileName = `${localKey.replace(/^w-/, "")}.${ext}`; // weapons: <id>.ext, mods: a-<id>.ext
        await writeFile(path.join(ROOT, "public", "weapons", localKey.startsWith("a-") ? `${localKey}.${ext}` : fileName), buf);
        const pubPath = `/weapons/${localKey.startsWith("a-") ? `${localKey}.${ext}` : fileName}`;
        if (localKey.startsWith("w-")) {
          const w = weapons.find((x) => x.id === localKey.slice(2));
          if (w) w.image = pubPath;
        } else {
          const a = attachments[localKey.slice(2)];
          if (a) a.image = pubPath;
        }
        await sleep(120);
      } catch { /* skip */ }
    }
    await sleep(600);
  }

  // Drop unresolved-image placeholders.
  for (const w of weapons) if (w.image?.endsWith(".IMG")) w.image = null;
  for (const a of Object.values(attachments)) if ((a as any).image?.endsWith(".IMG")) (a as any).image = null;

  for (const w of weapons) await writeFile(path.join(ROOT, "content", "weapons", `${w.id}.json`), JSON.stringify(w, null, 2) + "\n");
  await writeFile(path.join(ROOT, "content", "attachments.json"), JSON.stringify(attachments, null, 2) + "\n");
  console.log(`\nDone. ${weapons.length} weapons, ${Object.keys(attachments).length} attachments.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
