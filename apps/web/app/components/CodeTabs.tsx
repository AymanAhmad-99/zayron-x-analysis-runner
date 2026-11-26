"use client";
import { useState } from "react";

/**
 * PHASE 8A — the 1-click Detection-as-Code copy box.
 *
 * The code is a plain `<pre>` (never markup, never a link), so a query can never
 * become a clickable path to malicious infrastructure. `Copy` uses the async
 * clipboard API and reports its own state instead of silently failing.
 */

export interface CodeTab {
  label: string;
  code: string;
}

export function CodeTabs({ title, tabs, note }: { title: string; tabs: CodeTab[]; note?: string }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const current = tabs[Math.min(active, tabs.length - 1)];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!current) return null;

  return (
    <section className="detection-card" aria-label={title}>
      <div className="detection-head">
        <h3>{title}</h3>
        <button type="button" className="detection-copy" onClick={copy}>
          {copied ? "COPIED ✓" : "COPY"}
        </button>
      </div>
      <div className="detection-tabs" role="tablist" aria-label={`${title} formats`}>
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={index === active}
            className={index === active ? "detection-tab active" : "detection-tab"}
            onClick={() => {
              setActive(index);
              setCopied(false);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <pre className="detection-code" role="tabpanel" tabIndex={0}>
        <code>{current.code}</code>
      </pre>
      {note ? <p className="detection-note">{note}</p> : null}
    </section>
  );
}
