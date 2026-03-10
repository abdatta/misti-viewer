import { NextResponse } from "next/server";
import { getDatesFromFolder } from "@/lib/sim-reader";

export const dynamic = "force-dynamic";

export async function GET() {
  const dates = getDatesFromFolder("notes");
  return NextResponse.json({ dates });
}
