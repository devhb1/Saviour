import { NextResponse } from "next/server";
import { decodeTermLike, explainPrivilege } from "@saviours/queuewatch";

export const dynamic = "force-dynamic";

const DELAY = "0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33";
const SAFE = "0x26fCb50eEC367ddAB060ccf5E7394Cecd95F7Db2";
const DATA =
  "0xebb2b4a200000000000000000000000000000000000000000000000000000000000000009b56d5be0000000000000000000000000000000000000000000000000000000000000000610b59250000000000000000000000000ae12af3878a2d896f5c4dce3be7250fb187c0a6";

/**
 * Synthetic Term CRITICAL for end-to-end Watch → Review deep link.
 * Telegram fires only when TELEGRAM_BOT_TOKEN + chat ids are configured.
 */
export async function POST(req: Request) {
  let chatId: string | undefined;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      telegramChatId?: string;
    };
    chatId = body.telegramChatId?.trim() || undefined;
  } catch {
    /* empty body ok */
  }

  const decoded = decodeTermLike({
    rolesInner: ["setTxCooldown", "setTxExpiration", "enableModule"].map(
      (selectorHint) => ({
        to: DELAY,
        data: DATA,
        selectorHint,
      }),
    ),
  });
  const explanation = explainPrivilege(decoded);
  const reviewPath = `/review?chainId=1&safe=${encodeURIComponent(SAFE)}&to=${encodeURIComponent(DELAY)}&data=${encodeURIComponent(DATA)}&alert=${encodeURIComponent(explanation.summary.slice(0, 120))}`;

  const text = [
    `CRITICAL privilege · term-finance-delay (test)`,
    explanation.summary,
    ...explanation.bullets.slice(0, 3).map((b) => `• ${b}`),
    `review: https://www.saviours.xyz${reviewPath}`,
  ].join("\n");

  let telegram: { ok: boolean; dryRun?: boolean; status?: number } = {
    ok: false,
    dryRun: true,
  };
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const ids = [
    ...(chatId ? [chatId] : []),
    ...(process.env.TELEGRAM_CHAT_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ];
  if (token && ids.length) {
    const results = [];
    for (const chat_id of ids) {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id,
            text,
            disable_web_page_preview: true,
          }),
        },
      );
      results.push(res.ok);
    }
    telegram = { ok: results.every(Boolean), status: results.length };
  }

  return NextResponse.json({
    ok: true,
    severity: "CRITICAL",
    summary: explanation.summary,
    bullets: explanation.bullets,
    reviewPath,
    telegram,
    message: text,
  });
}
