"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import AppHeader from "@/components/AppHeader";

type MoneyEntry = {
  date: string;
  lastModified: number;
  markdownText: string;
};

function MoneyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const dateParam = searchParams.get("date");

  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(dateParam || "");
  const [entry, setEntry] = useState<MoneyEntry | null>(null);
  const [loading, setLoading] = useState(true);

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
      const res = await fetch("/api/money/dates");
      const data = await res.json();
      setDates(data.dates || []);
      if (data.dates?.length > 0 && !selectedDate && !dateParam) {
        handleDateChange(data.dates[0]); // default to latest
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEntry = async (date: string) => {
    setLoading(true);
    setEntry(null);
    try {
      const res = await fetch(`/api/money/${date}`);
      if (res.ok) {
        const data = await res.json();
        setEntry(data);
      }
    } catch (err) {
      console.error(err);
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
    if (selectedDate) {
      fetchEntry(selectedDate);
    }
  };

  const currentIndex = dates.indexOf(selectedDate);
  const hasNext = currentIndex > 0;
  const hasPrev = currentIndex < dates.length - 1;

  const handlePrevDay = () => {
    if (hasPrev) handleDateChange(dates[currentIndex + 1]);
  };

  const handleNextDay = () => {
    if (hasNext) handleDateChange(dates[currentIndex - 1]);
  };

  return (
    <div className="animate-fade-in">
      <AppHeader
        title="Money"
        icon={<Receipt size={32} />}
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
            onChange={(e) => handleDateChange(e.target.value)}
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
        <div className="empty-state animate-fade-in">Loading logs...</div>
      ) : !entry ? (
        <div className="empty-state animate-fade-in">
          No money logs found for this day.
        </div>
      ) : (
        <div className="card animate-fade-in" style={{ padding: "32px" }}>
          <MarkdownRenderer content={entry.markdownText} />
        </div>
      )}
    </div>
  );
}

export default function MoneyPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-fade-in">
          <div className="empty-state">Loading...</div>
        </div>
      }
    >
      <MoneyContent />
    </Suspense>
  );
}
