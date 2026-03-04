import { NextResponse } from "next/server";
import { getEventDates } from "@/lib/sim-reader";

export const dynamic = "force-dynamic";

export async function GET() {
  const dates = getEventDates();
  return NextResponse.json({ dates });
}
