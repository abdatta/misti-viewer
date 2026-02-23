"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import {
  Inbox as InboxIcon,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import AppHeader from "@/components/AppHeader";

type InboxItem = {
  direction: "inbound" | "outbound";
  type: string;
  contact: string;
  content: string;
  timestamp: string;
};

type InboxData = {
  lastModified: number;
  items: InboxItem[];
};

const getTypeStyles = (type: string) => {
  switch (type.toLowerCase()) {
    case "text":
      return { background: "#eef2ff", color: "#4f46e5" }; // Soft indigo
    case "email":
      return { background: "#f0fdf4", color: "#16a34a" }; // Soft green
    case "call":
      return { background: "#fff7ed", color: "#ea580c" }; // Soft orange
    case "imessage":
      return { background: "#eff6ff", color: "#2563eb" }; // Soft blue
    case "sms":
      return { background: "#fdf2f8", color: "#db2777" }; // Soft pink
    case "whatsapp":
      return { background: "#ecfdf5", color: "#059669" }; // Soft emerald
    default:
      return {
        background: "rgba(45, 42, 38, 0.04)",
        color: "var(--text-muted)",
      };
  }
};

export default function InboxPage() {
  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDateStr, setSelectedDateStr] = useState<string>("");

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inbox");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  // Compute unique dates from downloaded items
  const dates = Array.from(
    new Set(
      data?.items?.map((item) =>
        format(new Date(item.timestamp), "yyyy-MM-dd"),
      ) ?? [],
    ),
  ).sort((a, b) => b.localeCompare(a)); // sort descending

  useEffect(() => {
    if (dates.length > 0 && !selectedDateStr) {
      setSelectedDateStr(dates[0]); // default to the latest date
    }
  }, [dates, selectedDateStr]);

  const currentIndex = dates.indexOf(selectedDateStr);
  const hasNext = currentIndex > 0; // newer dates are earlier in the array
  const hasPrev = currentIndex !== -1 && currentIndex < dates.length - 1; // older dates

  const handlePrevDay = () => {
    if (hasPrev) setSelectedDateStr(dates[currentIndex + 1]);
  };

  const handleNextDay = () => {
    if (hasNext) setSelectedDateStr(dates[currentIndex - 1]);
  };

  const filteredItems =
    data?.items?.filter(
      (item) =>
        format(new Date(item.timestamp), "yyyy-MM-dd") === selectedDateStr,
    ) || [];

  return (
    <div className="animate-fade-in">
      <AppHeader
        title="Inbox"
        icon={<InboxIcon size={32} />}
        onRefresh={fetchInbox}
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
            value={selectedDateStr}
            onChange={(e) => setSelectedDateStr(e.target.value)}
            disabled={dates.length === 0}
          >
            {dates.length === 0 && <option value="">No dates available</option>}
            {dates.map((dateStr) => (
              <option key={dateStr} value={dateStr}>
                {format(parseISO(dateStr), "EEEE, MMM d, yyyy")}
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

      {loading && !data ? (
        <div className="empty-state">Loading inbox...</div>
      ) : !data || dates.length === 0 ? (
        <div className="empty-state">No inbox items found.</div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">No inbox items for this date.</div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginTop: "16px",
          }}
        >
          {filteredItems.map((item, i) => (
            <div
              key={i}
              className={`card animate-fade-in animate-delay-${(i % 4) + 1}`}
              style={{
                padding: "16px 20px",
                borderLeft:
                  item.direction === "inbound"
                    ? "4px solid var(--accent-color)"
                    : "4px solid var(--text-light)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    color: "var(--text-main)",
                  }}
                >
                  {item.direction === "inbound" ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "var(--accent-color)",
                      }}
                    >
                      <ArrowDownRight size={18} />
                      <span>{item.contact}</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "var(--text-muted)",
                      }}
                    >
                      <ArrowUpRight size={18} />
                      <span>{item.contact}</span>
                    </div>
                  )}
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "4px 10px",
                      borderRadius: "100px",
                      background: getTypeStyles(item.type).background,
                      color: getTypeStyles(item.type).color,
                      fontWeight: 600,
                      textTransform: "capitalize",
                      letterSpacing: "0.02em",
                      marginLeft: "4px",
                    }}
                  >
                    {item.type}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-light)",
                    fontWeight: 500,
                  }}
                >
                  {item.timestamp
                    ? format(new Date(item.timestamp), "h:mm a")
                    : ""}
                </div>
              </div>
              <MarkdownRenderer content={item.content} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
