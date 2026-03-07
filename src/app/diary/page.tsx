"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { format, parseISO, isToday, isYesterday, addDays } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  NotebookPen,
  NotebookText,
  Trash2,
} from "lucide-react";
import TimeIcon from "@/components/TimeIcon";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import AppHeader from "@/components/AppHeader";
import TTSPlayer from "@/components/TTSPlayer";
import CustomDatePicker from "@/components/CustomDatePicker";
import NoteDialog from "@/components/NoteDialog";

type Chunk = {
  timeLabel: string;
  markdownText: string;
  currentVersion?: string;
};

interface Note {
  id: string;
  timeLabel: string;
  selectedText: string;
  content: string;
  version: string;
  createdAt: string;
}

function DiaryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const dateParam = searchParams.get("date");

  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    dateParam || format(new Date(), "yyyy-MM-dd"),
  );
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChunks, setExpandedChunks] = useState<Record<number, boolean>>(
    {},
  );

  // Note specific states
  const [notes, setNotes] = useState<Note[]>([]);
  const [sourcePath, setSourcePath] = useState("");
  const [lastModified, setLastModified] = useState(0);
  const [selectedText, setSelectedText] = useState("");
  const [selectedChunkIndex, setSelectedChunkIndex] = useState<number | null>(
    null,
  );
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [expandedNotesChunks, setExpandedNotesChunks] = useState<
    Record<number, boolean>
  >({});

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const params = new URLSearchParams(searchParams.toString());
    if (isToday(parseISO(newDate))) {
      params.delete("date");
    } else {
      params.set("date", newDate);
    }
    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`);
  };

  const fetchDates = async () => {
    try {
      const res = await fetch("/api/diary/dates");
      const data = await res.json();
      setDates(data.dates || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEntry = async (date: string) => {
    setLoading(true);
    setExpandedChunks({});
    try {
      const res = await fetch(`/api/diary/${date}`);
      if (res.ok) {
        const data = await res.json();
        setChunks(data.chunks || []);
        setSourcePath(data.sourcePath || "");
        setLastModified(data.lastModified || 0);
      } else {
        setChunks([]);
        setSourcePath("");
        setLastModified(0);
      }
    } catch (err) {
      console.error(err);
      setChunks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDates();
  }, []);

  const fetchNotes = async (date: string) => {
    try {
      const res = await fetch(`/api/notes?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      } else {
        setNotes([]);
      }
    } catch (err) {
      console.error(err);
      setNotes([]);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchEntry(selectedDate);
      fetchNotes(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleSelectionChange = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (document.getElementById("note-dialog")) {
          return; // Do not alter selection state while dialog is open and user is typing
        }

        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          // Verify we aren't incorrectly wiping it when a dialog opening is in progress
          setSelectedText("");
          setSelectedChunkIndex(null);
          return;
        }

        const text = selection.toString().trim();
        if (!text) return;

        const anchorNode = selection.anchorNode;
        if (!anchorNode) return;

        let currentElement: HTMLElement | null = anchorNode.parentElement;
        let chunkIndex = -1;

        while (currentElement && currentElement.tagName !== "BODY") {
          if (
            currentElement.dataset &&
            currentElement.dataset.chunkIndex !== undefined
          ) {
            chunkIndex = parseInt(currentElement.dataset.chunkIndex, 10);
            break;
          }
          currentElement = currentElement.parentElement;
        }

        if (chunkIndex !== -1) {
          setSelectedText(text);
          setSelectedChunkIndex(chunkIndex);
        } else {
          setSelectedText("");
          setSelectedChunkIndex(null);
        }
      }, 150);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("touchend", handleSelectionChange);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("touchend", handleSelectionChange);
    };
  }, []);

  const handleSaveNote = async (content: string) => {
    if (selectedChunkIndex === null) return;
    const chunk = chunks[selectedChunkIndex];

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          timeLabel: chunk.timeLabel,
          selectedText,
          content,
          sourcePath,
          lastModified,
          chunkText: chunk.markdownText,
        }),
      });
      if (res.ok) {
        fetchNotes(selectedDate);
      }
    } catch (err) {
      console.error(err);
    }
    setIsNoteDialogOpen(false);
    setSelectedText("");
    setSelectedChunkIndex(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm("Are you sure you want to delete this note?")) {
      return;
    }

    try {
      const res = await fetch(`/api/notes?date=${selectedDate}&id=${noteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchNotes(selectedDate);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Hook into chunks loading to trigger cross-day auto-play
  useEffect(() => {
    if (!loading && localStorage.getItem("tts-continue-next-day") === "true") {
      // Always clear flag immediately so it doesn't loop or strand
      localStorage.removeItem("tts-continue-next-day");

      if (chunks.length > 0) {
        // We want to auto-play this new day's chronologically oldest entry,
        // which is the LAST one in the chunks array.
        setTimeout(() => {
          const oldestEntryIndex = chunks.length - 1;
          const playBtn = document.getElementById(
            `tts-play-btn-${oldestEntryIndex}`,
          );
          if (playBtn) {
            playBtn.scrollIntoView({ behavior: "smooth", block: "center" });
            playBtn.click();
          }
        }, 500); // Small delay to let DOM paint properly
      }
    }
  }, [chunks, loading]);

  const handleRefresh = () => {
    fetchDates();
    if (selectedDate) fetchEntry(selectedDate);
  };

  const isValidDate = (d: string) => {
    if (!d) return false;
    const parsed = new Date(d);
    return !isNaN(parsed.getTime());
  };
  const isSelectedInvalid = selectedDate ? !isValidDate(selectedDate) : false;

  const displayDates = [...dates];
  const todayStr = format(new Date(), "yyyy-MM-dd");
  if (!displayDates.includes(todayStr)) {
    displayDates.push(todayStr);
  }
  if (selectedDate && !displayDates.includes(selectedDate)) {
    displayDates.push(selectedDate);
  }
  if (!isSelectedInvalid) {
    displayDates.sort((a, b) => b.localeCompare(a));
  }

  let prevDateToNavigate: string | null = null;
  let nextDateToNavigate: string | null = null;

  if (isSelectedInvalid) {
    prevDateToNavigate =
      displayDates.length > 0 ? displayDates[displayDates.length - 1] : null;
    nextDateToNavigate = todayStr;
  } else if (selectedDate) {
    prevDateToNavigate = displayDates.find((d) => d < selectedDate) || null;
    nextDateToNavigate =
      [...displayDates].reverse().find((d) => d > selectedDate) || null;
  }

  const hasPrev = !!prevDateToNavigate;
  const hasNext = !!nextDateToNavigate;

  const handlePrevDay = () => {
    if (prevDateToNavigate) handleDateChange(prevDateToNavigate);
  };

  const handleNextDay = () => {
    if (nextDateToNavigate) handleDateChange(nextDateToNavigate);
  };

  const toggleExpand = (index: number) => {
    setExpandedChunks((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="animate-fade-in">
      <AppHeader
        title="Diary"
        icon={<BookOpen size={32} />}
        onRefresh={handleRefresh}
      />

      <div className="date-selector-container">
        <button
          className="btn-icon-clear"
          onClick={handlePrevDay}
          disabled={!hasPrev || displayDates.length === 0}
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>

        <div className="select-wrapper">
          <CustomDatePicker
            selectedDate={selectedDate}
            onChange={handleDateChange}
            displayDates={displayDates}
            disabled={displayDates.length === 0}
          />
        </div>

        <button
          className="btn-icon-clear"
          onClick={handleNextDay}
          disabled={!hasNext || displayDates.length === 0}
        >
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>
      </div>

      {loading ? (
        <div className="empty-state animate-fade-in">Loading entry...</div>
      ) : chunks.length === 0 ? (
        <div className="empty-state animate-fade-in">
          No diary entry for this day yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {chunks.map((chunk, i) => {
            const isLong = chunk.markdownText.length > 300;
            const isExpanded = expandedChunks[i] || !isLong;

            // Filter notes for this chunk
            const chunkNotes = notes.filter(
              (n) => n.timeLabel === chunk.timeLabel,
            );

            return (
              <div
                key={i}
                data-chunk-index={i}
                className={`card animate-fade-in animate-delay-${(i % 4) + 1}`}
                style={{ padding: "24px 32px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "16px",
                    color: "var(--text-muted)",
                  }}
                >
                  <TimeIcon
                    date={selectedDate}
                    timeLabel={chunk.timeLabel}
                    size={18}
                  />
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
                    {chunk.timeLabel}
                  </h3>
                  <div style={{ flex: 1 }} />

                  {selectedChunkIndex === i && selectedText && (
                    <button
                      className="btn-icon-clear"
                      onMouseDown={(e) => e.preventDefault()} // Keep selection
                      onClick={() => setIsNoteDialogOpen(true)}
                      style={{ color: "var(--accent-color)", padding: 4 }}
                      title="Add Note to Selection"
                    >
                      <NotebookPen size={18} />
                    </button>
                  )}

                  {chunkNotes.length > 0 && (
                    <button
                      className="btn-icon-clear"
                      onClick={() =>
                        setExpandedNotesChunks((prev) => ({
                          ...prev,
                          [i]: !prev[i],
                        }))
                      }
                      title="View Notes"
                      style={{ padding: 4 }}
                    >
                      <NotebookText size={18} color="var(--note-color)" />
                    </button>
                  )}

                  <TTSPlayer
                    id={`tts-play-btn-${i}`}
                    text={`${chunk.timeLabel}... ${chunk.markdownText}`}
                    onEnded={() => {
                      const isAutoPlay =
                        localStorage.getItem("tts-auto-play") === "true";
                      if (isAutoPlay) {
                        if (i > 0) {
                          // Play the next entry chronologically on the *current* day
                          const nextPlayerId = `tts-play-btn-${i - 1}`;
                          const nextBtn = document.getElementById(nextPlayerId);
                          if (nextBtn) {
                            nextBtn.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                            nextBtn.click();
                          }
                        } else if (hasNext) {
                          // We finished the chronological latest entry of this day.
                          // Move to the chronologically *next* day ONLY if it is actually the next calendar day.
                          const expectedNextDay = format(
                            addDays(parseISO(selectedDate), 1),
                            "yyyy-MM-dd",
                          );
                          if (
                            hasNext &&
                            nextDateToNavigate === expectedNextDay
                          ) {
                            // Set a specialized localstorage flag so the *next* page knows to auto-start
                            // its chronological oldest entry (which sits at chunks.length - 1).
                            localStorage.setItem(
                              "tts-continue-next-day",
                              "true",
                            );
                            handleNextDay();
                          }
                        }
                      }
                    }}
                  />
                </div>

                <div
                  style={{
                    maxHeight: isExpanded ? "none" : "120px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <MarkdownRenderer content={chunk.markdownText} />

                  {!isExpanded && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: "80px",
                        background: "var(--fade-gradient)",
                        pointerEvents: "none",
                      }}
                    />
                  )}
                </div>

                {isLong && (
                  <button
                    onClick={() => toggleExpand(i)}
                    style={{
                      marginTop: "16px",
                      color: "var(--accent-color)",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                    }}
                  >
                    {isExpanded ? "Read less" : "Read more"}
                  </button>
                )}

                {expandedNotesChunks[i] && chunkNotes.length > 0 && (
                  <div
                    className="animate-fade-in"
                    style={{
                      borderTop: "1px dashed var(--border-color)",
                      marginTop: 16,
                      paddingTop: 16,
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 12px 0",
                        fontSize: "0.95rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Notes
                    </h4>
                    {chunkNotes.map((n) => {
                      const isCurrent = n.version === chunk.currentVersion;
                      return (
                        <div
                          key={n.id}
                          style={{
                            marginBottom: 16,
                            padding: 12,
                            backgroundColor: "var(--surface-color)",
                            borderRadius: 8,
                            borderLeft: `3px solid ${isCurrent ? "var(--accent-color)" : "var(--text-muted)"}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: isCurrent
                                  ? "var(--accent-color)"
                                  : "var(--text-muted)",
                                marginBottom: 8,
                                fontWeight: 500,
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                              }}
                            >
                              {isCurrent ? "Current Version" : "Older Version"}{" "}
                              &bull;{" "}
                              {new Date(n.createdAt).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </div>
                            <button
                              onClick={() => handleDeleteNote(n.id)}
                              className="btn-icon-clear hover-scale"
                              style={{ padding: 4, color: "var(--text-muted)" }}
                              title="Delete Note"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div
                            style={{
                              fontStyle: "italic",
                              fontSize: "0.9rem",
                              color: "var(--text-muted)",
                              marginBottom: 8,
                            }}
                          >
                            "{n.selectedText}"
                          </div>
                          <div
                            style={{
                              fontSize: "0.95rem",
                              whiteSpace: "pre-wrap",
                              color: "var(--text-color)",
                            }}
                          >
                            {n.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <NoteDialog
        isOpen={isNoteDialogOpen}
        onClose={() => setIsNoteDialogOpen(false)}
        onSave={handleSaveNote}
        selectedText={selectedText}
        timeLabel={
          selectedChunkIndex !== null
            ? chunks[selectedChunkIndex].timeLabel
            : ""
        }
      />
    </div>
  );
}

export default function DiaryPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-fade-in">
          <div className="empty-state">Loading...</div>
        </div>
      }
    >
      <DiaryContent />
    </Suspense>
  );
}
