"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { RefreshCw, CalendarCheck } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";

type PlanChunk = {
  title: string;
  content: string;
};

type PlanData = {
  lastModified: number;
  chunks: PlanChunk[];
};

export default function PlanPage() {
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/plan");
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
    fetchPlan();
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <CalendarCheck color="var(--accent-color)" size={32} />
          <h1 className="page-title">Plan</h1>
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
          <button className="btn-icon" onClick={fetchPlan} title="Refresh">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="empty-state">Loading plan...</div>
      ) : !data || !data.chunks || data.chunks.length === 0 ? (
        <div className="empty-state">No plan content found.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {data.chunks.map((chunk, i) => (
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
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
                  {chunk.title}
                </h3>
              </div>
              <MarkdownRenderer content={chunk.content} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
