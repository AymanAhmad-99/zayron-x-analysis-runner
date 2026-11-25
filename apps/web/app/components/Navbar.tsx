"use client";

import { useEffect, useRef, useState } from "react";
import { searchIntelligence, type IntelligenceRecord } from "../lib/api";
import { intelligenceRoutes, routes } from "../lib/routes";

const categories = ["VULNERABILITY", "MALWARE", "EXPLOIT", "ARTICLE", "THREAT ACTOR", "IOC"];

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "empty" | "error">("idle");
  const [items, setItems] = useState<IntelligenceRecord[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  useEffect(() => {
    if (!query.trim()) { setItems([]); setState("idle"); return; }
    const timer = window.setTimeout(() => {
      setState("loading");
      searchIntelligence(query).then((result) => { setState(result.state); setItems(result.data?.items ?? []); }).catch(() => setState("error"));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  return <div className="search-overlay" role="dialog" aria-modal="true" aria-labelledby="global-search-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="search-panel"><div className="search-panel-head"><div><div className="eyebrow">GLOBAL SEARCH</div><h2 id="global-search-title">Find the signal.</h2></div><button className="search-close" type="button" onClick={onClose} aria-label="Close search">×</button></div><label className="global-search-input"><span aria-hidden="true">⌕</span><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vulnerabilities, malware, exploits, actors..." aria-label="Search intelligence" /><kbd>ESC</kbd></label><div className="search-categories" aria-label="Search categories">{categories.map((category) => <button type="button" key={category} onClick={() => setQuery(category)}>{category}</button>)}</div><div className="search-panel-results" aria-live="polite">{state === "idle" && <p className="search-panel-hint">Enter a query to search the connected intelligence index.</p>}{state === "loading" && <p className="search-panel-hint">SEARCHING THE INTELLIGENCE INDEX</p>}{state === "empty" && <p className="search-panel-hint">NO MATCHES FROM THE CONNECTED API</p>}{state === "error" && <p className="search-panel-hint search-panel-error">INTELLIGENCE SEARCH CURRENTLY UNAVAILABLE</p>}{state === "success" && items.map((item, index) => <article className="global-search-result" key={item.id || index} tabIndex={0}><div><span>{item.type || "RECORD"}</span><h3>{item.title || item.id}</h3>{item.summary && <p>{item.summary}</p>}</div><aside>{item.severity && <b>{item.severity}</b>}{item.updatedAt && <time>{item.updatedAt}</time>}</aside></article>)}</div></div></div>;
}

export function SearchTrigger() { const [open, setOpen] = useState(false); return <>{<button className="app-search-trigger" type="button" onClick={() => setOpen(true)}>SEARCH <span aria-hidden="true">⌕</span></button>}{open && <SearchOverlay onClose={() => setOpen(false)} />}</>; }

export function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  // Hover-intent: short delay before closing so cursor can travel into the panel.
  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setMenuOpen(false), 140);
  };
  const cancelClose = () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); if (closeTimer.current) window.clearTimeout(closeTimer.current); };
  }, []);

  return (
    <header className="nav shell">
      <a className="wordmark" href={routes.home.href} aria-label="ZAYRON-X home">ZAYRON-<b>X</b></a>
      <nav aria-label="Primary">
        <a className="active" href={routes.home.href}>Home</a>
        <div
          className={`nav-dropdown${menuOpen ? " open" : ""}`}
          onMouseEnter={() => { cancelClose(); setMenuOpen(true); }}
          onMouseLeave={scheduleClose}
        >
          <button
            type="button"
            className="nav-dropdown-trigger"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            onClick={() => setMenuOpen((v) => !v)}
            onFocus={() => { cancelClose(); setMenuOpen(true); }}
          >
            Intelligence
          </button>
          <div className="menu" role="menu" aria-label="Intelligence sections">
            <a href={routes.intelligence.href} role="menuitem" onClick={() => setMenuOpen(false)}>Overview</a>
            {intelligenceRoutes.map((item) => <a href={item.href} role="menuitem" key={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>)}
          </div>
        </div>
        {/* Institutional navigation: the research and company surfaces sit beside
            the intelligence tree, and pricing is a standalone route rather than a
            homepage anchor. */}
        <a href="/methodology">Methodology</a>
        <a href={routes.pricing.href}>Pricing</a>
        <a href={routes.developers.href} aria-label="API / Developers">API</a>
        <a href="/about">About</a>
      </nav>
      <button className="nav-search-pill" type="button" onClick={() => setSearchOpen(true)} aria-label="Open search">
        <span aria-hidden="true">⌕</span>
        <span className="nav-search-pill-text">Search</span>
      </button>
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </header>
  );
}
