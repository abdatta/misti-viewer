"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { format, parseISO, isToday } from "date-fns";

import { PenTool, ChevronLeft, ChevronRight } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import AppHeader from "@/components/AppHeader";
import CustomDatePicker from "@/components/CustomDatePicker";

type PlanChunk = {
  title: string;
  content: string;
};

type PlanData = {
  lastModified: number;
  todayDate: string;
  chunks: PlanChunk[];
};

type NoteData = {
  date: string;
  lastModified: number;
  content: string;
  currentVersion: string;
};

function NotebookEntry({ content }: { content: string }) {
  if (!content) return null;

  // Strip leading date header (e.g. # 2026-01-15) to avoid double date display
  const displayContent = content.replace(/^#\s*\d{4}-\d{2}-\d{2}\s*\n+/, "");

  return (
    <div className="notebook-paper animate-fade-in">
      <div className="notebook-content">
        <MarkdownRenderer content={displayContent} disableProseLayout={true} />
      </div>
    </div>
  );
}

function NotesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const dateParam = searchParams.get("date");

  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    dateParam || format(new Date(), "yyyy-MM-dd"),
  );

  const [noteData, setNoteData] = useState<NoteData | null>(null);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDates = async () => {
    try {
      const res = await fetch("/api/notes/dates");
      const data = await res.json();
      setDates(data.dates || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDates();
  }, []);

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

  const fetchNotesAndPlan = async () => {
    setLoading(true);
    try {
      const [notesRes, planRes] = await Promise.all([
        fetch(`/api/notes?date=${selectedDate}`),
        fetch(`/api/plan?date=${selectedDate}`),
      ]);

      if (notesRes.ok) {
        const json = await notesRes.json();
        setNoteData(json.content ? json : null);
      } else {
        setNoteData(null);
      }

      if (planRes.ok) {
        const json = await planRes.json();
        setPlanData(json);
      } else {
        setPlanData(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotesAndPlan();
  }, [selectedDate]);

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

  const showPlan = planData && selectedDate === planData.todayDate;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: "100px" }}>
      <AppHeader
        title="Notes"
        icon={<PenTool size={32} />}
        onRefresh={() => {
          fetchDates();
          fetchNotesAndPlan();
        }}
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

      {loading && !noteData && !planData ? (
        <div className="empty-state">Loading notes...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {/* Notes Section */}
          {!noteData ? (
            <div className="empty-state">No notes found for this date.</div>
          ) : (
            <NotebookEntry content={noteData.content} />
          )}

          {/* Plan Section (Appended only if it's the Plan's todayDate) */}
          {showPlan && planData.chunks && planData.chunks.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                marginTop: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    height: "1px",
                    flex: 1,
                    backgroundColor: "var(--border-subtle)",
                  }}
                />
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Current Plan
                </span>
                <div
                  style={{
                    height: "1px",
                    flex: 1,
                    backgroundColor: "var(--border-subtle)",
                  }}
                />
              </div>

              {planData.chunks.map((chunk, i) => (
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
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.25rem",
                        fontWeight: 600,
                      }}
                    >
                      {chunk.title}
                    </h3>
                  </div>
                  <MarkdownRenderer content={chunk.content} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-fade-in">
          <div className="empty-state">Loading notes...</div>
        </div>
      }
    >
      <NotesContent />
    </Suspense>
  );
}
