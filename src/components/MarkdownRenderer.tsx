"use client";

import React, { useEffect, useState, useRef } from "react";
import { marked } from "marked";
import { createPortal } from "react-dom";

export interface Note {
  id: string;
  timeLabel: string;
  selectedText: string;
  content: string;
  version: string;
  createdAt: string;
}

interface MarkdownRendererProps {
  content: string;
  notes?: Note[];
  currentVersion?: string;
  disableProseLayout?: boolean;
}

const MarkdownRenderer = React.memo(
  ({
    content,
    notes = [],
    currentVersion,
    disableProseLayout = false,
  }: MarkdownRendererProps) => {
    const [html, setHtml] = useState<string>("");
    const containerRef = useRef<HTMLDivElement>(null);

    const [activeNote, setActiveNote] = useState<Note | null>(null);
    const [floatiePos, setFloatiePos] = useState<{
      top: number;
      left: number;
      isAbove?: boolean;
    } | null>(null);
    const floatieRef = useRef<HTMLDivElement>(null);

    // Pre-process markdown to handle non-standard patterns from notes
    const preprocessMarkdown = (md: string): string => {
      return md
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map((line) => {
          const trimmed = line.trimStart();
          const indent = line.slice(0, line.length - trimmed.length);

          // Already a proper list item — skip
          if (/^[-+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
            return line;
          }

          // Pattern 1: ~~[x] text~~ trailing   or  ~~[ ] text~~ trailing
          // Strikethrough means completed — always render as checked
          const strikeCheckbox = trimmed.match(
            /^~~\[([x \-])\]\s*(.*?)~~(.*)$/i,
          );
          if (strikeCheckbox) {
            const [, , innerText, trailing] = strikeCheckbox;
            return `${indent}- [x] ~~${innerText}~~${trailing}`;
          }

          // Pattern 2: [x] text  or  [ ] text  or  [-] text  (bare, no strikethrough)
          const bareCheckbox = trimmed.match(/^\[([x \-])\]\s*(.*)/i);
          if (bareCheckbox) {
            const [, check, rest] = bareCheckbox;
            const isChecked = check.toLowerCase() === "x" || check === "-";
            return `${indent}- [${isChecked ? "x" : " "}] ${rest}`;
          }

          // Pattern 3: *Text (asterisk used as bullet without space)
          // Must not match *text* (italic) or ** (bold) or * alone
          if (/^\*[^\s*]/.test(trimmed)) {
            return `${indent}- ${trimmed.slice(1)}`;
          }

          return line;
        })
        .join("\n");
    };

    // Initial HTML rendering and text highlighting
    useEffect(() => {
      const processed = preprocessMarkdown(content);
      const rawHtml = marked.parse(processed, {
        async: false,
        breaks: true,
        gfm: true,
      }) as string;
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawHtml, "text/html");

      notes.forEach((note) => {
        if (!note.selectedText.trim()) return;

        const isCurrent = note.version === currentVersion;
        const markClass = isCurrent ? "highlight-current" : "highlight-older";

        highlightTextInNode(
          doc,
          doc.body,
          note.selectedText.trim(),
          markClass,
          note.id,
        );
      });

      setHtml(doc.body.innerHTML);
    }, [content, notes, currentVersion]);

    // Click outside and scroll handling for floatie
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          floatieRef.current &&
          !floatieRef.current.contains(e.target as Node)
        ) {
          setActiveNote(null);
        }
      };
      const handleScroll = () => {
        setActiveNote(null);
      };

      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("scroll", handleScroll, true);
      };
    }, []);

    const highlightTextInNode = (
      doc: Document,
      node: Node,
      text: string,
      className: string,
      noteId: string,
    ) => {
      const normalize = (s: string) => s.replace(/\s+/g, "");
      const normalizedSearch = normalize(text);
      if (!normalizedSearch) return;

      const walker = doc.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
      let currentNode = walker.nextNode();
      const textNodes: { node: Text; text: string }[] = [];

      while (currentNode) {
        const textNode = currentNode as Text;
        // Skip if already inside a mark to avoid double highlighting or infinite loops
        if (textNode.parentNode?.nodeName !== "MARK") {
          textNodes.push({ node: textNode, text: textNode.nodeValue || "" });
        }
        currentNode = walker.nextNode();
      }

      const charMap: { nodeIndex: number; offset: number }[] = [];
      let fullNormalizedText = "";

      textNodes.forEach((nodeInfo, i) => {
        for (let j = 0; j < nodeInfo.text.length; j++) {
          if (!/\s/.test(nodeInfo.text[j])) {
            charMap.push({ nodeIndex: i, offset: j });
            fullNormalizedText += nodeInfo.text[j];
          }
        }
      });

      const matchIdx = fullNormalizedText.indexOf(normalizedSearch);
      if (matchIdx === -1) return;

      const startInfo = charMap[matchIdx];
      const endInfo = charMap[matchIdx + normalizedSearch.length - 1];

      const nodesToReplace: {
        node: Text;
        startOffset: number;
        endOffset: number;
      }[] = [];

      for (let i = startInfo.nodeIndex; i <= endInfo.nodeIndex; i++) {
        const textNode = textNodes[i].node;
        const textLen = textNodes[i].text.length;

        let startOffset = 0;
        let endOffset = textLen;

        if (i === startInfo.nodeIndex) {
          startOffset = startInfo.offset;
        }
        if (i === endInfo.nodeIndex) {
          endOffset = endInfo.offset + 1;
        }

        nodesToReplace.push({ node: textNode, startOffset, endOffset });
      }

      for (let i = nodesToReplace.length - 1; i >= 0; i--) {
        const { node: textNode, startOffset, endOffset } = nodesToReplace[i];
        const parent = textNode.parentNode;
        if (!parent) continue;

        const textValue = textNode.nodeValue || "";
        const beforeText = textValue.substring(0, startOffset);
        const matchText = textValue.substring(startOffset, endOffset);
        const afterText = textValue.substring(endOffset);

        if (beforeText) {
          parent.insertBefore(doc.createTextNode(beforeText), textNode);
        }

        if (matchText) {
          const markElem = doc.createElement("mark");
          markElem.className = className;
          markElem.setAttribute("data-note-id", noteId);
          markElem.textContent = matchText;
          parent.insertBefore(markElem, textNode);
        }

        if (afterText) {
          parent.insertBefore(doc.createTextNode(afterText), textNode);
        }

        parent.removeChild(textNode);
      }
    };

    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      // We might have clicked inside the mark or the mark itself.
      const mark = target.closest("mark[data-note-id]");
      if (!mark) {
        if (!floatieRef.current?.contains(target)) {
          setActiveNote(null);
        }
        return;
      }

      const noteId = mark.getAttribute("data-note-id");
      if (!noteId) return;

      const note = notes.find((n) => n.id === noteId);
      if (note) {
        const rect = mark.getBoundingClientRect();
        setActiveNote(note);

        // Decide vertical placement
        const SPACE_ABOVE = 120; // estimated max height
        const isAbove = rect.top > SPACE_ABOVE;

        // Anchor horizontal position exactly at the center of the selection
        let leftPos = rect.left + rect.width / 2 + window.scrollX;
        let topPos = isAbove
          ? rect.top + window.scrollY - 8
          : rect.bottom + window.scrollY + 8;

        setFloatiePos({
          top: topPos,
          left: leftPos,
          isAbove,
        });
        e.stopPropagation();
      }
    };

    // Correct floatie overflow using post-render DOM measurement
    useEffect(() => {
      if (activeNote && floatieRef.current && floatiePos) {
        const floatie = floatieRef.current;
        const baseTransform = floatiePos.isAbove
          ? "translate(-50%, -100%)"
          : "translate(-50%, 0)";

        // Apply baseline transform first to measure raw anchor coordinates
        floatie.style.transform = baseTransform;

        const rect = floatie.getBoundingClientRect();
        const margin = 16;
        let shiftX = 0;

        if (rect.left < margin) {
          shiftX = margin - rect.left;
        } else if (rect.right > window.innerWidth - margin) {
          shiftX = window.innerWidth - margin - rect.right;
        }

        if (shiftX !== 0) {
          floatie.style.transform = `${baseTransform} translateX(${shiftX}px)`;
        }
      }
    }, [activeNote, floatiePos]);

    return (
      <div style={{ position: "relative" }}>
        <div
          ref={containerRef}
          className={`${disableProseLayout ? "" : "prose"} animate-fade-in`}
          dangerouslySetInnerHTML={{ __html: html }}
          onClick={handleContainerClick}
        />

        {activeNote && (
          <style>{`
            mark[data-note-id="${activeNote.id}"] {
              background-color: rgba(255, 158, 143, 0.6) !important;
            }
            :root.dark mark[data-note-id="${activeNote.id}"] {
              background-color: rgba(255, 140, 122, 0.5) !important;
            }
          `}</style>
        )}

        {activeNote &&
          floatiePos &&
          typeof window !== "undefined" &&
          createPortal(
            <div
              ref={floatieRef}
              className="note-floatie animate-fade-in"
              style={{
                position: "absolute",
                top: floatiePos.top,
                left: floatiePos.left,
                transform: floatiePos.isAbove
                  ? "translate(-50%, -100%)"
                  : "translate(-50%, 0)",
                zIndex: 99999,
                width: "max-content",
                maxWidth: "calc(100vw - 32px)",
              }}
            >
              <div className="note-floatie-header">
                <span
                  style={{
                    fontWeight: 600,
                    color: "var(--text-main)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  Notes
                  <span
                    className={`pill-base ${activeNote.version === currentVersion ? "" : "pill-default"}`}
                    style={
                      activeNote.version === currentVersion
                        ? {
                            background: "rgba(255, 158, 143, 0.2)",
                            color: "var(--accent-color)",
                          }
                        : {}
                    }
                  >
                    {activeNote.version === currentVersion ? "Current" : "Old"}
                  </span>
                </span>
                <span className="note-floatie-date">
                  {new Date(activeNote.createdAt).toLocaleDateString(
                    undefined,
                    {
                      month: "short",
                      day: "numeric",
                    },
                  )}
                </span>
              </div>
              <div className="note-floatie-content">{activeNote.content}</div>
            </div>,
            document.body,
          )}
      </div>
    );
  },
);

MarkdownRenderer.displayName = "MarkdownRenderer";

export default MarkdownRenderer;
