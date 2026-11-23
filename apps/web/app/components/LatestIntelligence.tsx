"use client";
import { useEffect, useState } from "react";
import { getIntelligence, type IntelligenceRecord } from "../lib/api";

function formatTimestamp(value?: string) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function Skeleton() { return <div className="latest-intelligence-skeleton" aria-label="Loading latest intelligence" aria-busy="true">{[1, 2, 3].map((item) => <div className="latest-skeleton-row" key={item}><i /><div><b /><span /><span /></div><em /><em /></div>)}</div>; }
function RecordRow({ item }: { item: IntelligenceRecord }) {
  const severity = item.severity?.toUpperCase();
  const assessment = item.status?.toUpperCase();
  const timestamp = formatTimestamp(item.updatedAt);
  const href = (item.id?.toUpperCase().startsWith("CVE-") || item.type?.toLowerCase() === "vulnerability")
    ? `/intelligence/vulnerabilities/${encodeURIComponent(item.id)}`
    : "/intelligence";
  return (
    <article className="latest-intelligence-row">
      <div className="latest-record-type">
        <span>{item.type}</span>
        <small>{item.id}</small>
      </div>
      <div className="latest-record-main">
        <h3>
          <a href={href} style={{ color: "inherit", textDecoration: "none" }}>{item.title || item.id}</a>
        </h3>
        {item.summary && <p>{item.summary}</p>}
      </div>
      <div className="latest-record-meta">
        {severity && <span className={`latest-severity severity-${severity.toLowerCase()}`}><i aria-hidden="true" />{severity}</span>}
        {assessment && <span className={`latest-assessment assessment-${assessment.toLowerCase()}`}><i aria-hidden="true" />{assessment}</span>}
        {item.confidence !== undefined && <span className="latest-confidence">CONFIDENCE {item.confidence}</span>}
        {timestamp && <time dateTime={item.updatedAt}>{timestamp}</time>}
      </div>
    </article>
  );
}
export function LatestIntelligence() { const [state, setState] = useState<"loading" | "success" | "empty" | "error">("loading"); const [items, setItems] = useState<IntelligenceRecord[]>([]); useEffect(() => { getIntelligence({ limit: 25 }).then((result) => { setState(result.state); setItems(result.data?.items.slice(0, 5) ?? []); }).catch(() => setState("error")); }, []); return <section className="latest-intelligence-section shell" id="latest-intelligence" aria-labelledby="latest-intelligence-heading"><div className="latest-intelligence-intro"><div><div className="eyebrow">04 / SIGNAL INDEX</div><h2 id="latest-intelligence-heading">LATEST INTELLIGENCE</h2></div><p>Recent intelligence across vulnerabilities, malware, exploits, actors and connected evidence.</p></div>{state === "loading" && <Skeleton />}{state === "error" && <div className="latest-intelligence-state error"><strong>INTELLIGENCE CURRENTLY UNAVAILABLE</strong><span>The connected intelligence service did not return a usable response.</span></div>}{state === "empty" && <div className="latest-intelligence-state"><strong>NO CURRENT INTELLIGENCE</strong><span>The connected intelligence service has no published records at this time.</span></div>}{state === "success" && <div className="latest-intelligence-list" role="list">{items.map((item) => <RecordRow item={item} key={item.id} />)}</div>}<a className="latest-intelligence-cta" href="/intelligence">VIEW ALL INTELLIGENCE <span aria-hidden="true">→</span></a></section>; }
