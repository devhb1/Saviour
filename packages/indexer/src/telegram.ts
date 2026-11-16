export async function sendTelegram(text: string, chatIds?: string[]) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const ids =
    chatIds?.length
      ? chatIds
      : (process.env.TELEGRAM_CHAT_IDS ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

  if (!token || ids.length === 0) {
    console.log("[telegram:dry-run]", text.slice(0, 240));
    return { ok: false, dryRun: true as const };
  }

  const results = [];
  for (const chat_id of ids) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id,
        text,
        disable_web_page_preview: true,
      }),
    });
    results.push({ chat_id, status: res.status, ok: res.ok });
  }
  return { ok: results.every((r) => r.ok), results };
}

export async function sendWebhook(url: string, body: unknown) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
