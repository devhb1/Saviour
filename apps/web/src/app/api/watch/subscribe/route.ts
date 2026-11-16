import { NextResponse } from "next/server";
import { addSubscriber, listSubscribers } from "@/lib/watchStore";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    subscribers: listSubscribers(),
    note: "Seed Term targets always listed. New subs persist to disk when writable; otherwise session memory + browser localStorage.",
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      chainId?: number;
      target?: string;
      label?: string;
      telegramChatId?: string;
      webhookUrl?: string;
    };
    const target = body.target?.trim();
    if (!target || !/^0x[a-fA-F0-9]{40}$/.test(target)) {
      return NextResponse.json(
        { error: "valid target 0x address required" },
        { status: 400 },
      );
    }
    const subscriber = addSubscriber({
      chainId: body.chainId ?? 1,
      target,
      label: body.label,
      telegramChatId: body.telegramChatId?.trim() || undefined,
      webhookUrl: body.webhookUrl?.trim() || undefined,
    });
    return NextResponse.json({
      ok: true,
      subscriber,
      note: subscriber.durable
        ? "Saved on server"
        : "Saved in session memory — also kept in your browser. For durable Telegram, set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_IDS on the indexer host.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
