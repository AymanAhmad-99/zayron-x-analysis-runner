"use client";
import { useState } from "react";

/** One-click copy of a plain-text brief. No data leaves the browser. */
export function CopyBriefButton({ text, label = "COPY BRIEF" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="ioc-cta"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "COPIED" : label}
    </button>
  );
}
