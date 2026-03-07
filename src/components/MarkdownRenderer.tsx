"use client";

import React, { useEffect, useState } from "react";
import { marked } from "marked";

const MarkdownRenderer = React.memo(({ content }: { content: string }) => {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    // Configure marked to handle returns and synchronous parsing
    const parsed = marked.parse(content, { async: false }) as string;
    setHtml(parsed);
  }, [content]);

  return (
    <div
      className="prose animate-fade-in"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";

export default MarkdownRenderer;
