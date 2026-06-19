import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { bugReportSchema } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Olive accent (matches --gold), as a Discord integer color.
const EMBED_COLOR = 0x9da079;

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`bug:${ip}`, 5, 60_000).ok) {
    return NextResponse.json(
      { error: "Too many reports — please wait a minute and try again." },
      { status: 429 },
    );
  }

  // Bug reports require an account.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You must be logged in to report a bug." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bugReportSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const webhookUrl = process.env.DISCORD_BUG_WEBHOOK_URL;
  if (!webhookUrl) {
    // Misconfiguration, not the user's fault — don't leak details.
    console.error("DISCORD_BUG_WEBHOOK_URL is not set");
    return NextResponse.json(
      { error: "Bug reporting is not configured right now." },
      { status: 500 },
    );
  }

  const { message, page, contact } = parsed.data;
  const reporter =
    session.user.name || session.user.email || `user ${session.user.id}`;
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  const embed = {
    title: "🐞 Bug report",
    description: message,
    color: EMBED_COLOR,
    fields: [
      { name: "Page", value: page || "—", inline: true },
      { name: "Reporter", value: reporter, inline: true },
      ...(contact ? [{ name: "Contact", value: contact, inline: true }] : []),
      { name: "User agent", value: userAgent.slice(0, 1000), inline: false },
    ],
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "Tarkovsky Bugs", embeds: [embed] }),
    });
    if (!res.ok) {
      console.error("Discord webhook failed", res.status);
      return NextResponse.json(
        { error: "Could not send the report. Please try again later." },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error("Discord webhook error", err);
    return NextResponse.json(
      { error: "Could not send the report. Please try again later." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
