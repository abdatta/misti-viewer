import { NextResponse } from "next/server";
import { Communicate, listVoices } from "edge-tts-universal";
import { writeFileSync } from "fs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text");
    const requestedVoice = searchParams.get("voice");

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Use requested voice, otherwise default to Emma
    const voice = requestedVoice || "en-US-EmmaMultilingualNeural";

    // Create Communicate instance for streaming
    const communicate = new Communicate(text, { voice });

    // Create a ReadableStream that will be piped to the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Iterate over the chunks yielded by communicate.stream()
          for await (const chunk of communicate.stream()) {
            if (chunk.type === "audio" && chunk.data) {
              // Enqueue the raw audio buffer into the stream
              controller.enqueue(chunk.data);
            }
          }
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("TTS streaming setup error:", error);
    return NextResponse.json(
      { error: "Failed to initialize TTS stream" },
      { status: 500 },
    );
  }
}
