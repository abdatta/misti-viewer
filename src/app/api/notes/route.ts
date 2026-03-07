import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const NOTES_DIR = path.join(process.cwd(), "diary_notes");

export interface Note {
  id: string;
  timeLabel: string;
  selectedText: string;
  content: string;
  version: string;
  versionPayload: {
    sourcePath: string;
    lastModified: number;
    chunkHash: string;
  };
  createdAt: string;
}

function ensureNotesDir() {
  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json(
      { error: "Missing date parameter" },
      { status: 400 },
    );
  }

  const filePath = path.join(NOTES_DIR, `${date}.json`);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ notes: [] });
  }

  try {
    const data = fs.readFileSync(filePath, "utf-8");
    const notes: Note[] = JSON.parse(data);
    return NextResponse.json({ notes });
  } catch (error) {
    console.error(`Error reading notes for ${date}:`, error);
    return NextResponse.json(
      { error: "Failed to read notes" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      date,
      timeLabel,
      selectedText,
      content,
      sourcePath,
      lastModified,
      chunkText,
    } = body;

    if (
      !date ||
      !timeLabel ||
      !selectedText ||
      !content ||
      !sourcePath ||
      !lastModified ||
      !chunkText
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    ensureNotesDir();

    // Create a stable version identifier by hashing the combination of path, time, and content
    const chunkHash = crypto
      .createHash("sha256")
      .update(chunkText)
      .digest("hex");
    const versionString = `${sourcePath}|${lastModified}|${chunkHash}`;
    const version = crypto
      .createHash("md5")
      .update(versionString)
      .digest("hex");

    const newNote: Note = {
      id: crypto.randomUUID(),
      timeLabel,
      selectedText,
      content,
      version,
      versionPayload: {
        sourcePath,
        lastModified,
        chunkHash,
      },
      createdAt: new Date().toISOString(),
    };

    const filePath = path.join(NOTES_DIR, `${date}.json`);
    let notes: Note[] = [];

    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      notes = JSON.parse(data);
    }

    notes.push(newNote);
    fs.writeFileSync(filePath, JSON.stringify(notes, null, 2));

    return NextResponse.json({ success: true, note: newNote });
  } catch (error) {
    console.error("Error saving note:", error);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const id = searchParams.get("id");

    if (!date || !id) {
      return NextResponse.json(
        { error: "Missing date or id parameter" },
        { status: 400 },
      );
    }

    const filePath = path.join(NOTES_DIR, `${date}.json`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const data = fs.readFileSync(filePath, "utf-8");
    let notes: Note[] = JSON.parse(data);
    const initialLength = notes.length;

    notes = notes.filter((note) => note.id !== id);

    if (notes.length === initialLength) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    fs.writeFileSync(filePath, JSON.stringify(notes, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 },
    );
  }
}
