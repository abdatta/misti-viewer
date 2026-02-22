"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { RefreshCw, Inbox as InboxIcon } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";

type InboxData = {
  lastModified: number;
  items: string[];
};

export default function InboxPage() {
  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <InboxIcon color="var(--accent-color)" size={32} />
          <h1 className="page-title">Inbox</h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {data && (
            <span
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              Updated {format(data.lastModified, "MMM d, h:mm a")}
            </span>
          )}
          <button className="btn-icon" onClick={fetchInbox} title="Refresh">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="empty-state">Loading inbox...</div>
      ) : !data || !data.items || data.items.length === 0 ? (
        <div className="empty-state">No inbox items found.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {data.items.map((item, i) => (
            <div
              key={i}
              className={`card animate-fade-in animate-delay-${(i % 4) + 1}`}
              style={{ padding: "24px 32px" }}
            >
              <MarkdownRenderer content={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
