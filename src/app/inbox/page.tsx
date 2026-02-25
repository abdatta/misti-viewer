"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import {
  Inbox as InboxIcon,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import AppHeader from "@/components/AppHeader";

type InboxItem = {
  direction: "inbound" | "outbound";
  type: string;
  contact: string;
  content: string;
  timestamp: string;
  timeLocal: string;
};

type InboxData = {
  lastModified: number;
  items: InboxItem[];
};

const getTypeClass = (type: string) => {
  switch (type.toLowerCase()) {
    case "text":
      return "pill-text";
    case "email":
      return "pill-email";
    case "call":
      return "pill-call";
    case "voicemail":
      return "pill-voicemail";
    case "invite":
      return "pill-invite";
    case "encounter":
      return "pill-encounter";
    case "dialogue":
      return "pill-dialogue";
    case "imessage":
      return "pill-imessage";
    case "sms":
      return "pill-sms";
    case "whatsapp":
      return "pill-whatsapp";
    default:
      return "pill-default";
  }
};

function InboxContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const dateParam = searchParams.get("date");

  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    dateParam || "",
  );

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

  const handleDateChange = (newDate: string) => {
    setSelectedDateStr(newDate);
    const params = new URLSearchParams(searchParams.toString());
    if (isToday(parseISO(newDate))) {
      params.delete("date");
    } else {
      params.set("date", newDate);
    }
    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`);
  };

  useEffect(() => {
    if (dates.length > 0 && !selectedDateStr && !dateParam) {
      handleDateChange(dates[0]); // default to the latest date
    }
  }, [dates, selectedDateStr, dateParam, pathname, router, searchParams]);

  const currentIndex = dates.indexOf(selectedDateStr);
  const hasNext = currentIndex > 0; // newer dates are earlier in the array
  const hasPrev = currentIndex !== -1 && currentIndex < dates.length - 1; // older dates

  const handlePrevDay = () => {
    if (hasPrev) handleDateChange(dates[currentIndex + 1]);
  };

  const handleNextDay = () => {
    if (hasNext) handleDateChange(dates[currentIndex - 1]);
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
            onChange={(e) => handleDateChange(e.target.value)}
            disabled={dates.length === 0}
          >
            {dates.length === 0 && <option value="">No dates available</option>}
            {dates.map((dateStr) => {
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
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span>You</span>
                        <ArrowRight size={14} />
                        <span>{item.contact}</span>
                      </span>
                    </div>
                  )}
                  <span className={`pill-base ${getTypeClass(item.type)}`}>
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
                  {item.timeLocal}
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

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-fade-in">
          <div className="empty-state">Loading...</div>
        </div>
      }
    >
      <InboxContent />
    </Suspense>
  );
}
