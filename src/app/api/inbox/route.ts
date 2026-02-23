import { NextResponse } from "next/server";
import { getAllEvents } from "@/lib/sim-reader";

export const dynamic = "force-dynamic";

export async function GET() {
  const allEvents = getAllEvents();

  if (!allEvents || allEvents.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const items: any[] = [];
  let latestModified = 0;

  for (const event of allEvents) {
    const timestamp = event.timestamp_iso;
    if (timestamp) {
      const timestampMs = new Date(timestamp).getTime();
      if (timestampMs > latestModified) {
        latestModified = timestampMs;
      }
    }

    if (event.inbound && Array.isArray(event.inbound)) {
      for (const item of event.inbound) {
        if (item.type !== "other") {
          items.push({
            direction: "inbound",
            type: item.type,
            contact: item.from || "Unknown",
            content: item.content || "",
            timestamp: timestamp,
          });
        }
      }
    }

    if (event.outbound && Array.isArray(event.outbound)) {
      for (const item of event.outbound) {
        if (item.type !== "other") {
          items.push({
            direction: "outbound",
            type: item.type,
            contact: item.to || "Unknown",
            content: item.content || "",
            timestamp: timestamp,
          });
        }
      }
    }
  }

  // Sort descending by timestamp (newest first)
  items.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return NextResponse.json({
    lastModified: latestModified || Date.now(),
    items: items,
  });
}
