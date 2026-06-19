/*
 * Post an update to Discord via webhook.
 *
 * Two modes:
 *   devlog  — compact per-change note (fired automatically by the post-commit hook)
 *   release — curated feature / fix announcement (run manually when we ship)
 *
 * Webhook URLs come from env (kept in .env.local, never committed):
 *   DISCORD_DEVLOG_WEBHOOK_URL
 *   DISCORD_RELEASE_WEBHOOK_URL
 *
 * Usage:
 *   node --env-file-if-exists=.env.local scripts/notify.mts devlog  "<title>" ["<body>"]
 *   node --env-file-if-exists=.env.local scripts/notify.mts release "<title>" ["<body>"]
 */

const REPO_URL = "https://github.com/Hercegman/tarkovsky";
const LIVE_URL = "https://tarkovsky.vercel.app";

const OLIVE = 0x9da079; // matches --gold
const OLIVE_HI = 0xc1c39e; // matches --gold-hi

type Mode = "devlog" | "release";

const [, , modeArg, title, body] = process.argv;

if (modeArg !== "devlog" && modeArg !== "release") {
  console.error(
    'Usage: node scripts/notify.mts <devlog|release> "<title>" ["<body>"]',
  );
  process.exit(2);
}
const mode = modeArg as Mode;

if (!title || !title.trim()) {
  console.error("A non-empty title is required.");
  process.exit(2);
}

const envVar =
  mode === "devlog"
    ? "DISCORD_DEVLOG_WEBHOOK_URL"
    : "DISCORD_RELEASE_WEBHOOK_URL";
const webhookUrl = process.env[envVar];

if (!webhookUrl) {
  console.error(
    `${envVar} is not set. Add it to .env.local (see playbook/projects/Tarkovsky/Discord Integration.md).`,
  );
  process.exit(1);
}

const embed =
  mode === "devlog"
    ? {
        title: title.slice(0, 256),
        description: (body ?? "").slice(0, 4000) || undefined,
        url: REPO_URL,
        color: OLIVE,
        footer: { text: "dev log" },
        timestamp: new Date().toISOString(),
      }
    : {
        title: `✨ ${title}`.slice(0, 256),
        description:
          [(body ?? "").trim(), `\n**Live:** ${LIVE_URL}`]
            .filter(Boolean)
            .join("\n")
            .slice(0, 4000) || `**Live:** ${LIVE_URL}`,
        color: OLIVE_HI,
        footer: { text: "Tarkovsky release" },
        timestamp: new Date().toISOString(),
      };

const username = mode === "devlog" ? "Tarkovsky Dev" : "Tarkovsky Releases";

const res = await fetch(webhookUrl, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username, embeds: [embed] }),
});

if (!res.ok) {
  console.error(`Discord webhook failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}

console.log(`Posted ${mode} update to Discord.`);
