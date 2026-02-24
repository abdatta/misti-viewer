"use client";

import { useState, useEffect } from "react";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { ChevronLeft, ChevronRight, BookOpen, Clock } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import AppHeader from "@/components/AppHeader";

type Chunk = {
  timeLabel: string;
  markdownText: string;
};

export default function DiaryPage() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChunks, setExpandedChunks] = useState<Record<number, boolean>>(
    {},
  );

  const fetchDates = async () => {
    try {
      const res = await fetch("/api/diary/dates");
      const data = await res.json();
      setDates(data.dates || []);
      if (data.dates?.length > 0 && !selectedDate) {
        setSelectedDate(data.dates[0]); // default to latest
      }
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

  const handleRefresh = () => {
    fetchDates();
    if (selectedDate) fetchEntry(selectedDate);
  };

  const currentIndex = dates.indexOf(selectedDate);
  const hasNext = currentIndex > 0; // newer dates are earlier in array
  const hasPrev = currentIndex < dates.length - 1; // older dates

  const handlePrevDay = () => {
    if (hasPrev) setSelectedDate(dates[currentIndex + 1]);
  };

  const handleNextDay = () => {
    if (hasNext) setSelectedDate(dates[currentIndex - 1]);
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
          disabled={!hasPrev || dates.length === 0}
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>

        <div className="select-wrapper">
          <select
            className="select-pretty"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={dates.length === 0}
          >
            {dates.length === 0 && <option value="">No dates available</option>}
            {dates.map((date) => {
              const d = parseISO(date);
              return (
                <option key={date} value={date}>
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
          disabled={!hasNext || dates.length === 0}
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
