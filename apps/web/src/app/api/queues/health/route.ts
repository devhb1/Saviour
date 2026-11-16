import { NextResponse } from "next/server";
import { computeHealth, loadQueues, loadTip } from "@/lib/queueHealth";

export const dynamic = "force-dynamic";

export async function GET() {
  const queues = loadQueues();
  const tip = loadTip();
  return NextResponse.json({
    queues,
    health: computeHealth(tip),
    recentAlerts: tip.alerts?.slice(0, 10) ?? [],
  });
}
