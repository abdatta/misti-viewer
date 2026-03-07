import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface NoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  selectedText: string;
  timeLabel: string;
}

export default function NoteDialog({
  isOpen,
  onClose,
  onSave,
  selectedText,
  timeLabel,
}: NoteDialogProps) {
  const [content, setContent] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      id="note-dialog"
      className="animate-fade-in"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(8px)",
        padding: "16px",
      }}
    >
      <div
        className="animate-scale-up"
        style={{
          width: "100%",
          maxWidth: "36rem",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          backgroundColor: "var(--bg-color)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background:
              "linear-gradient(90deg, var(--accent-color), transparent)",
            opacity: 0.8,
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px 24px 16px 24px",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "1.4rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              Add a Note
            </h2>
            {timeLabel && (
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "var(--accent-color)",
                  backgroundColor: "rgba(100, 150, 255, 0.1)",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                }}
              >
                {timeLabel}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="btn-icon-clear hover-scale"
            style={{
              padding: "6px",
              backgroundColor: "var(--surface-color)",
              borderRadius: "50%",
            }}
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span
              style={{
                fontSize: "0.8rem",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "var(--text-muted)",
                letterSpacing: "0.05em",
              }}
            >
              Referenced Text
            </span>
            <div
              style={{
                padding: "16px 20px",
                backgroundColor: "var(--surface-color)",
                borderRadius: "12px",
                borderLeft: "4px solid var(--accent-color)",
                color: "var(--text-color)",
                fontStyle: "italic",
                fontSize: "0.95rem",
                lineHeight: 1.5,
                maxHeight: "140px",
                overflowY: "auto",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              "{selectedText}"
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What are your thoughts on this?"
              style={{
                width: "100%",
                padding: "20px",
                backgroundColor: "var(--bg-color)",
                border: "2px solid var(--surface-color)",
                borderRadius: "12px",
                minHeight: "160px",
                outline: "none",
                resize: "vertical",
                color: "var(--text-color)",
                fontFamily: "inherit",
                fontSize: "1.05rem",
                lineHeight: 1.6,
                transition: "border-color 0.2s ease",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--accent-color)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--surface-color)")
              }
              autoFocus
            />
          </div>
        </div>

        <div
          style={{
            padding: "16px 24px",
            backgroundColor: "var(--surface-color)",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <button
            onClick={onClose}
            className="btn-icon-clear"
            style={{
              padding: "10px 24px",
              borderRadius: "10px",
              fontWeight: 600,
              color: "var(--text-muted)",
              margin: "0 12px",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(content);
              setContent("");
            }}
            disabled={!content.trim()}
            style={{
              padding: "10px 24px",
              borderRadius: "10px",
              fontWeight: 600,
              backgroundColor: "var(--accent-color)",
              color: "white",
              border: "none",
              opacity: content.trim() ? 1 : 0.4,
              cursor: content.trim() ? "pointer" : "not-allowed",
              boxShadow: content.trim()
                ? "0 4px 12px rgba(96, 165, 250, 0.3)"
                : "none",
              transition: "all 0.2s ease",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
