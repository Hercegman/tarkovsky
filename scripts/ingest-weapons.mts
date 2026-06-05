/*
 * Project Tarkovsky — gun builder data (approximate, wiki-only).
 *
 * Ingests ALL firearms from the EFT Wiki: base stats + Mods slots (compatible
 * attachments) + each attachment's stat modifiers and nested sub-slots (2 levels).
 *   content/weapons/<id>.json, content/attachments.json, public/weapons/<id>.<ext>
 *
 * Source: EFT Wiki (CC BY-NC-SA). Approximate — cross-slot conflicts and some
 * mods aren't modelled.
 *
 * Usage: node scripts/ingest-weapons.mts [--limit N]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UA =
  "ProjectTarkovsky/1.0 (https://github.com/Hercegman/tarkovsky; grizelj.roko@gmail.com)";
const API = "https://escapefromtarkov.fandom.com/api.php";
const ROOT = process.cwd();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const limit = (() => {
  const i = process.argv.indexOf("--limit");
  return i >= 0 ? Number(process.argv[i + 1]) : null;
})();

async function api(p: Record<string, string>): Promise<any> {
  const url = new URL(API);
  url.search = new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...p }).toString();
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429 || res.status === 503) { await sleep(4000); continue; }
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  }
  throw new Error("API retries exhausted");
}
function chunk<T>(a: T[], n: number): T[][] {
  const o: T[][] = [];
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n));
  return o;
}
const slug = (s: string) =>
  s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const extFor = (b: Uint8Array) => (b[0] === 0x89 ? "png" : b[0] === 0xff ? "jpg" : b[0] === 0x52 ? "webp" : "png");

function ibField(wt: string, key: string): string | null {
  const m = wt.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n]*)`, "i"));
  return m ? m[1].trim() : null;
}
const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").trim();
function num(s: string | null): number | null {
  if (!s) return null;
  // Stop at a pipe: empty infobox fields bleed into the next field ("|recoil=-1"),
  // which would otherwise be mis-read. Numeric values never contain a pipe.
  const m = stripTags(s).split("|")[0].replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}
function fileField(wt: string, key: string): string | null {
  const v = ibField(wt, key);
  if (!v) return null;
  return v.replace(/\[\[|\]\]/g, "").replace(/^File:/i, "").split("|")[0].trim() || null;
}

interface Slot { name: string; allowed: string[]; }

function modsRegion(html: string): string {
  const i = html.search(/id="Mods"/);
  if (i < 0) return "";
  const after = html.slice(i + 5);
  const nh = after.search(/<h2[ >]/);
  return nh >= 0 ? html.slice(i, i + 5 + nh) : html.slice(i, i + 40000);
}
function slotNames(wt: string): string[] {
  const sec = wt.match(/==\s*Mods\s*==([\s\S]*?)(?=\n==[^=]|$)/i)?.[1] || "";
  const tab = sec.match(/<tabber>([\s\S]*?)<\/tabber>/i)?.[1] ?? sec;
  return tab.split(/\|-\|/).map((b) => {
    const m = b.match(/^\s*([^=\n|{}]+?)\s*=/);
    return m ? m[1].trim() : "";
  });
}
function parseMods(html: string, wt: string, strict = false): { slots: Slot[]; pages: Map<string, string> } {
  const pages = new Map<string, string>(); // page title -> (we just need the title)
  const slots: Slot[] = [];
  const region = modsRegion(html);
  if (!region) return { slots, pages };
  const names = slotNames(wt);
  const contents = region.split("wds-tab__content").slice(1);
  for (let i = 0; i < contents.length; i++) {
    const block = contents[i];
    const allowed: string[] = [];
    const titleBySlug = new Map<string, string>();
    const seen = new Set<string>();
    const re = /<a href="\/wiki\/([^"#:]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(block))) {
      const page = decodeURIComponent(m[1]).replace(/_/g, " ");
      if (/^(Weapon mods|Category|File|Special|Template|Help|Ammunition|Ammo)/i.test(page)) continue;
      const s = slug(page);
      if (seen.has(s)) continue;
      seen.add(s);
      allowed.push(s);
      titleBySlug.set(s, page);
    }
    const name = (names[i] || `Slot ${i + 1}`).trim();
    // Skip non-mod tabs (compatibility lists, etc.) and over-large lists that
    // are clearly compatibility tables rather than real sub-slots.
    if (/compat|used in|trade|barter|craft|descr|variant|ammo|caliber/i.test(name)) continue;
    if (allowed.length === 0 || (strict && allowed.length > 60)) continue;
    for (const a of allowed) pages.set(titleBySlug.get(a)!, titleBySlug.get(a)!);
    slots.push({ name, allowed });
  }
  return { slots, pages };
}

async function getFirearms(): Promise<string[]> {
  let all: string[] = [];
  let c: string | undefined;
  do {
    const d = await api({ action: "query", list: "categorymembers", cmtitle: "Category:Weapons", cmlimit: "500", cmtype: "page", ...(c ? { cmcontinue: c } : {}) });
    all.push(...(d.query?.categorymembers ?? []).map((m: { title: string }) => m.title));
    c = d.continue?.cmcontinue;
    if (c) await sleep(500);
  } while (c);
  return all.filter(
    (t) =>
      /(rifle|carbine|submachine gun|shotgun|pistol|machine gun|marksman|revolver)/i.test(t) &&
      !/grenade launcher|bayonet|knife|dagger|axe|machete|toy|kukri|hatchet|sword|gladius|cleaver|katana|signal pistol/i.test(t) &&
      !/\((WTS|Golden|Redline|t|5-46)\)/i.test(t),
  );
}

const attDefaults = (id: string, name: string) => ({
  id, name, image: null as string | null, ergo: 0, recoil: 0, accuracy: 0, weight: 0,
  type: null as string | null, slots: [] as Slot[],
});

async function main() {
  await mkdir(path.join(ROOT, "content", "weapons"), { recursive: true });
  await mkdir(path.join(ROOT, "public", "weapons"), { recursive: true });

  let titles = await getFirearms();
  if (limit) titles = titles.slice(0, limit);
  console.log(`Firearms: ${titles.length}`);

  const weapons: any[] = [];
  const imageJobs = new Map<string, string>(); // localKey -> File title
  const attachments: Record<string, any> = {};
  const attachPages = new Map<string, string>(); // slug -> page title (to fetch)

  // 1) Weapons.
  for (const title of titles) {
    try {
      const wt = (await api({ action: "parse", page: title, prop: "wikitext" })).parse?.wikitext as string | undefined;
      const html = (await api({ action: "parse", page: title, prop: "text" })).parse?.text as string | undefined;
      if (!wt || !html) continue;
      const rec = ibField(wt, "Weaprecoil") || "";
      const { slots, pages } = parseMods(html, wt);
      for (const p of pages.keys()) attachPages.set(slug(p), p);
      const id = slug(title);
      const imgFile = fileField(wt, "image");
      if (imgFile) imageJobs.set(`w-${id}`, imgFile);
      weapons.push({
        id, name: title, page: title, image: null,
        ergonomics: num(ibField(wt, "ergonomics")),
        recoilVertical: num((rec.match(/Vertical:\s*([^<|]+)/i) || [])[1] || null),
        recoilHorizontal: num((rec.match(/Horizontal:\s*([^<|]+)/i) || [])[1] || null),
        moa: num(ibField(wt, "MOA")),
        weight: num(ibField(wt, "weight")),
        fireRate: num(ibField(wt, "rof")),
        caliber: stripTags(ibField(wt, "caliber") || "").replace(/\[\[|\]\]/g, "") || null,
        slots,
        source: { url: `https://escapefromtarkov.fandom.com/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`, license: "CC BY-NC-SA", wiki: "Escape from Tarkov Wiki" },
      });
      console.log(`  ${title}: ${slots.length} slots`);
      await sleep(800);
    } catch (e) {
      console.warn(`  ! ${title}: ${(e as Error).message}`);
    }
  }

  // 2) Attachments — two levels of nesting.
  // Level fetch: batch wikitext for stats + detect a Mods tabber; record which need HTML.
  async function fetchInfoboxes(pages: { slug: string; page: string }[], allowNested: boolean): Promise<{ slug: string; page: string }[]> {
    const needHtml: { slug: string; page: string }[] = [];
    const wtBySlug = new Map<string, string>();
    for (const part of chunk(pages, 50)) {
      const data = await api({ action: "query", prop: "revisions", rvprop: "content", rvslots: "main", titles: part.map((p) => p.page).join("|") });
      for (const p of data.query?.pages ?? []) {
        if (p.missing) continue;
        const wt = p.revisions?.[0]?.slots?.main?.content as string | undefined;
        if (!wt) continue;
        const s = slug(p.title);
        const a = attDefaults(s, p.title);
        a.ergo = num(ibField(wt, "ergonomics")) ?? 0;
        a.recoil = num(ibField(wt, "recoil")) ?? 0;
        a.accuracy = num(ibField(wt, "accuracy")) ?? 0;
        a.weight = num(ibField(wt, "weight")) ?? 0;
        a.type = ((ibField(wt, "type") || "").replace(/\[\[|\]\]/g, "").split("|").pop() || "").trim() || null;
        attachments[s] = a;
        const iconFile = fileField(wt, "icon") || fileField(wt, "image");
        if (iconFile) imageJobs.set(`a-${s}`, iconFile);
        if (allowNested && (/<tabber>/i.test(wt) || /==\s*Mods\s*==/i.test(wt))) {
          needHtml.push({ slug: s, page: p.title });
          wtBySlug.set(s, wt);
        }
      }
      process.stdout.write(`  …${Object.keys(attachments).length} attachments\r`);
      await sleep(600);
    }
    // For mods with sub-slots, fetch rendered HTML → nested slots + new sub-pages.
    const newPages: { slug: string; page: string }[] = [];
    for (const { slug: s, page } of needHtml) {
      try {
        const html = (await api({ action: "parse", page, prop: "text" })).parse?.text as string | undefined;
        if (!html) continue;
        const { slots, pages: subPages } = parseMods(html, wtBySlug.get(s) || "", true);
        if (slots.length) attachments[s].slots = slots;
        for (const p of subPages.keys()) {
          const ss = slug(p);
          if (!attachments[ss] && !attachPages.has(ss)) {
            newPages.push({ slug: ss, page: p });
            attachPages.set(ss, p);
          }
        }
        await sleep(500);
      } catch { /* skip */ }
    }
    return newPages;
  }

  console.log(`\nLevel-1 attachments: ${attachPages.size}`);
  const l1 = [...attachPages.entries()].map(([s, p]) => ({ slug: s, page: p }));
  const l2 = await fetchInfoboxes(l1, true);
  console.log(`\nLevel-2 attachments: ${l2.length}`);
  if (l2.length) await fetchInfoboxes(l2, false);

  // 3) Images.
  console.log(`\nDownloading ${imageJobs.size} images…`);
  let ok = 0;
  for (const part of chunk([...imageJobs.entries()], 50)) {
    const titlesParam = part.map(([, fn]) => `File:${fn}`).join("|");
    const info = await api({ action: "query", titles: titlesParam, prop: "imageinfo", iiprop: "url", iiurlwidth: "160" });
    const norm = (s: string) => s.replace(/_/g, " ").toLowerCase();
    const byFile = new Map<string, string>();
    for (const p of info.query?.pages ?? []) {
      const u = p.imageinfo?.[0]?.thumburl ?? p.imageinfo?.[0]?.url;
      if (u) byFile.set(norm(p.title), u);
    }
    for (const [localKey, fn] of part) {
      const u = byFile.get(norm(`File:${fn}`));
      if (!u) continue;
      try {
        const buf = new Uint8Array(await (await fetch(u, { headers: { "User-Agent": UA } })).arrayBuffer());
        const ext = extFor(buf);
        const isWeapon = localKey.startsWith("w-");
        const fileName = isWeapon ? `${localKey.slice(2)}.${ext}` : `${localKey}.${ext}`;
        await writeFile(path.join(ROOT, "public", "weapons", fileName), buf);
        const pub = `/weapons/${fileName}`;
        if (isWeapon) { const w = weapons.find((x) => x.id === localKey.slice(2)); if (w) w.image = pub; }
        else { const a = attachments[localKey.slice(2)]; if (a) a.image = pub; }
        ok++;
        await sleep(110);
      } catch { /* skip */ }
    }
    process.stdout.write(`  …${ok} downloaded\r`);
    await sleep(500);
  }

  for (const w of weapons) await writeFile(path.join(ROOT, "content", "weapons", `${w.id}.json`), JSON.stringify(w, null, 2) + "\n");
  await writeFile(path.join(ROOT, "content", "attachments.json"), JSON.stringify(attachments, null, 2) + "\n");
  console.log(`\nDone. ${weapons.length} weapons, ${Object.keys(attachments).length} attachments, ${ok} images.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
