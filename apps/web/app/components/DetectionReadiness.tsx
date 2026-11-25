"use client";

import { useEffect, useState } from "react";
import { getDetectionRules, type DetectionRule } from "../lib/api";

/**
 * PHASE 7C — verified detection coverage card.
 *
 * Renders ONLY when the backend returns at least one real upstream rule file
 * (Sigma in `SigmaHQ/sigma`, template in `projectdiscovery/nuclei-templates`).
 * There is no fallback text, no "coming soon" state and no synthesized rule id:
 * a dossier with no coverage simply shows no card.
 *
 * The only external links here are the official GitHub blob URLs the indexer
 * stored, so nothing user-supplied is ever placed in an `href`.
 */

function CopyRule({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="mr-copy-button"
      onClick={async () => {
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        } catch {
          setCopied(false);
        }
      }}
      aria-label={`Copy rule id ${text}`}
    >
      {copied ? "Copied" : "Copy rule ID"}
    </button>
  );
}

function isSafeRuleUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "github.com";
  } catch {
    return false;
  }
}

export function DetectionReadiness({ cve, family }: { cve?: string; family?: string }) {
  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!cve && !family) return;
    getDetectionRules({ cve, family }).then((result) => {
      if (cancelled || !result.data) return;
      setRules(result.data.rules ?? []);
      setSyncedAt(result.data.synced_at);
    });
    return () => {
      cancelled = true;
    };
  }, [cve, family]);

  if (rules.length === 0) return null;

  const target = cve ? `CVE ${cve}` : family ? `${family} activity` : "this dossier";

  return (
    <section className="det-readiness" aria-label="Detection and hunting readiness">
      <header>
        <div>
          <span>DETECTION &amp; HUNTING READINESS</span>
          <p>
            {rules.length} verified upstream rule{rules.length === 1 ? "" : "s"} reference {target}. Each link opens the
            official repository file; nothing here is generated or inferred by ZAYRON-X.
          </p>
        </div>
        {syncedAt ? <small>indexed {syncedAt}</small> : null}
      </header>
      <ul>
        {rules.map((rule) => (
          <li key={`${rule.source}:${rule.path}`}>
            <span className={`det-source ${rule.source}`}>{rule.source}</span>
            <code>{rule.rule_id}</code>
            <CopyRule text={rule.rule_id} />
            {isSafeRuleUrl(rule.url) ? (
              <a href={rule.url} target="_blank" rel="noopener noreferrer nofollow">
                Official rule ↗
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
