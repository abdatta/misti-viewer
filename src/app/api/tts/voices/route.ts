import { NextResponse } from "next/server";
import { listVoicesUniversal } from "edge-tts-universal";

export async function GET() {
  try {
    const rawVoices = await listVoicesUniversal();
    const voices = rawVoices.filter((v) => v.Gender === "Female");
    return NextResponse.json({ voices });
  } catch (error) {
    console.error("Failed to fetch voices:", error);
    return NextResponse.json(
      { error: "Failed to fetch voices" },
      { status: 500 },
    );
  }
}
