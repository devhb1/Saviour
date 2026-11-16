import { NextResponse } from "next/server";
import { computeHealth, loadQueues, loadTip } from "@/lib/queueHealth";

export const dynamic = "force-dynamic";

export async function GET() {
  const queues = loadQueues();
  const tip = loadTip();
  const health = computeHealth(tip);
  return NextResponse.json({
    queues,
    health,
    recentAlerts: tip.alerts?.slice(0, 10) ?? [],
    productNote:
      "Transaction Review (/review) is the product. Watch/queues are prototype surfaces.",
  });
}
