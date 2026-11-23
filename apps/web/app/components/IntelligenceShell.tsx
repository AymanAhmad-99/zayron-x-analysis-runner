"use client";
import { useEffect, useState } from "react";
import { getIntelligence, type IntelligenceRecord } from "../lib/api";
import { IntelligenceShellFrame } from "./IntelligenceShellFrame";

function getRecordHref(item: IntelligenceRecord): string {
  const id = item.id || "";
  const type = (item.type || "").toLowerCase();
  if (type === "vulnerability" || type === "vulnerabilities" || id.toUpperCase().startsWith("CVE-")) {
    return `/intelligence/vulnerabilities/${encodeURIComponent(id)}`;
  }
  if (type === "malware") return `/intelligence/malware`;
  if (type === "exploit" || type === "exploits") return `/intelligence/exploits`;
  if (type === "actor" || type === "threat actor") return `/intelligence/actors`;
  if (type === "campaign" || type === "campaigns") return `/intelligence/campaigns`;
  if (type === "ioc" || type === "iocs") return `/intelligence/iocs`;
  return `/intelligence/vulnerabilities/${encodeURIComponent(id)}`;
}

function RecentState({ items, loading, error }: { items: IntelligenceRecord[]; loading: boolean; error: boolean }) {
  if (loading) return <div className="workspace-state"><strong>LOADING INTELLIGENCE</strong><span>Connecting to the current intelligence index.</span></div>;
  if (error) return <div className="workspace-state error"><strong>INTELLIGENCE CURRENTLY UNAVAILABLE</strong><span>The connected intelligence service did not return a usable response.</span></div>;
  if (!items.length) return <div className="workspace-state"><strong>NO CURRENT INTELLIGENCE</strong><span>The connected intelligence service has no published records at this time.</span></div>;
  return (
    <div className="shell-records">
      {items.slice(0, 5).map((item) => {
        const href = getRecordHref(item);
        return (
          <article key={item.id} className="shell-record-row">
            <span>{item.type || "RECORD"}</span>
            <h3>
              <a href={href} className="shell-record-link" style={{ color: "inherit", textDecoration: "none" }}>
                {item.title || item.id}
              </a>
            </h3>
            <small>{item.summary}</small>
          </article>
        );
      })}
    </div>
  );
}

export function IntelligenceShell() {
  const [items, setItems] = useState<IntelligenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    getIntelligence({ limit: 25 }).then((result) => {
      setItems(result.data?.items ?? []);
      setError(result.state === "error");
    }).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);
  return (
    <IntelligenceShellFrame eyebrow="INTELLIGENCE / OVERVIEW" activeHref="/intelligence" headingId="workspace-heading">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">INTELLIGENCE / OVERVIEW</span>
          <h1 id="workspace-heading">Latest intelligence.</h1>
          <p>Evidence-led records from the ZAYRON-X intelligence service.</p>
        </div>
        <span className="workspace-status"><i />PREVIEW API</span>
      </div>
      <div className="workspace-summary">
        <article><small>INDEX STATUS</small><strong>{loading ? "CONNECTING" : error ? "UNAVAILABLE" : "CONNECTED"}</strong><span>LIVE SERVICE</span></article>
        <article><small>VISIBLE RECORDS</small><strong>{loading ? "—" : items.length}</strong><span>HOMEPAGE FEED</span></article>
        <article><small>WORKSPACE MODE</small><strong>ANALYST</strong><span>READ-ONLY FOUNDATION</span></article>
      </div>
      <div className="workspace-section-head"><span>RECENT INTELLIGENCE</span><small>LIMIT 25 / DISPLAY 5</small></div>
      <RecentState items={items} loading={loading} error={error} />
    </IntelligenceShellFrame>
  );
}
