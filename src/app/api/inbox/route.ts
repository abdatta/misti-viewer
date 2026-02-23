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

    if (event.exchanges && Array.isArray(event.exchanges)) {
      for (const item of event.exchanges) {
        if (item.type !== "other") {
          items.push({
            direction: item.direction === "in" ? "inbound" : "outbound",
            type: item.type,
            contact: item.party,
            content: item.content,
            timestamp: timestamp,
            timeLocal: item.time_local,
          });
        }
      }
    }
  }

  // Sort descending by timestamp (newest first)
  items.sort((a, b) => {
    const diff =
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    if (diff !== 0) return diff;

    const parseTime = (t: string) => {
      if (!t) return 0;
      const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 0;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const isPM = match[3].toUpperCase() === "PM";
      if (h === 12) h = isPM ? 12 : 0;
      else if (isPM) h += 12;
      return h * 60 + m;
    };

    // Secondary sort descending by parsed timeLocal
    return parseTime(b.timeLocal) - parseTime(a.timeLocal);
  });

  return NextResponse.json({
    lastModified: latestModified || Date.now(),
    items: items,
  });
}
