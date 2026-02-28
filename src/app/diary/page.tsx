"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { ChevronLeft, ChevronRight, BookOpen, Clock } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import AppHeader from "@/components/AppHeader";
import TTSPlayer from "@/components/TTSPlayer";

type Chunk = {
  timeLabel: string;
  markdownText: string;
};

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
      } else {
        setChunks([]);
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

  useEffect(() => {
    if (selectedDate) {
      fetchEntry(selectedDate);
    }
  }, [selectedDate]);

  // Hook into chunks loading to trigger cross-day auto-play
  useEffect(() => {
    if (
      chunks.length > 0 &&
      localStorage.getItem("tts-continue-next-day") === "true"
    ) {
      // Clear flag immediately so it doesn't loop
      localStorage.removeItem("tts-continue-next-day");

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
  }, [chunks]);

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
          <select
            className="select-pretty"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            disabled={displayDates.length === 0}
          >
            {displayDates.length === 0 && (
              <option value="">No dates available</option>
            )}
            {displayDates.map((dateStr) => {
              if (dateStr === selectedDate && isSelectedInvalid) {
                return (
                  <option key={dateStr} value={dateStr}>
                    Invalid Date
                  </option>
                );
              }
              const d = parseISO(dateStr);
              return (
                <option key={dateStr} value={dateStr}>
                  {isToday(d)
                    ? "Today"
                    : isYesterday(d)
                      ? "Yesterday"
                      : format(d, "EEEE, MMM d, yyyy")}
                </option>
              );
            })}
          </select>
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

            return (
              <div
                key={i}
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
                  <Clock size={18} />
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
                    {chunk.timeLabel}
                  </h3>
                  <div style={{ flex: 1 }} />
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
                          // Move to the chronologically *next* day.
                          // Set a specialized localstorage flag so the *next* page knows to auto-start
                          // its chronological oldest entry (which sits at chunks.length - 1).
                          localStorage.setItem("tts-continue-next-day", "true");
                          handleNextDay();
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
              </div>
            );
          })}
        </div>
      )}
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
