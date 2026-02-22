"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Inbox as InboxIcon } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import AppHeader from "@/components/AppHeader";

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
      <AppHeader
        title="Inbox"
        icon={<InboxIcon size={32} />}
        onRefresh={fetchInbox}
        lastUpdated={
          data ? format(data.lastModified, "MMM d, h:mm a") : undefined
        }
      />

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
