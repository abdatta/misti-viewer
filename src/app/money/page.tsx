"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import AppHeader from "@/components/AppHeader";

type MoneyEntry = {
  date: string;
  lastModified: number;
  markdownText: string;
};

export default function MoneyPage() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [entry, setEntry] = useState<MoneyEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDates = async () => {
    try {
      const res = await fetch("/api/money/dates");
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
    if (hasPrev) setSelectedDate(dates[currentIndex + 1]);
  };

  const handleNextDay = () => {
    if (hasNext) setSelectedDate(dates[currentIndex - 1]);
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
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={dates.length === 0}
          >
            {dates.length === 0 && <option value="">No dates available</option>}
            {dates.map((date) => (
              <option key={date} value={date}>
                {format(parseISO(date), "EEEE, MMM d, yyyy")}
              </option>
            ))}
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
