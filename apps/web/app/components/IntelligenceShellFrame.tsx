"use client";
import { useEffect, useState, type ReactNode } from "react";
import { SearchTrigger } from "./Navbar";
import { intelligenceRoutes, routes } from "../lib/routes";

/**
 * Shared responsive intelligence shell.
 *
 * Single source of truth for the intelligence workspace chrome used by the
 * Overview, the entity/route pages (RouteShell), and the vulnerability listing.
 * At <=900px the sidebar is off-canvas; this shell is the ONLY place that renders
 * the mobile toggle + scrim, so every page that uses it has reachable navigation.
 */

const NAV_ITEMS = [routes.intelligence, ...intelligenceRoutes];

function IntelligenceNavPanel({ activeHref, onNavigate }: { activeHref: string; onNavigate: () => void }) {
  return (
    <nav className="intelligence-nav" aria-label="Intelligence workspace">
      <div className="intelligence-nav-label">INTELLIGENCE</div>
      {NAV_ITEMS.map((item) => {
        const active = item.href === activeHref;
        return (
          <a
            className={`intelligence-nav-item${active ? " active" : ""}`}
            href={item.href}
            onClick={onNavigate}
            key={item.href}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
            <span aria-hidden="true">↗</span>
          </a>
        );
      })}
      <div className="intelligence-nav-label discovery-label">DISCOVERY</div>
      <SearchTrigger />
    </nav>
  );
}

export function IntelligenceShellFrame({
  eyebrow,
  activeHref: activeHrefProp,
  statusLabel,
  headerExtra,
  children,
  className,
  headingId = "route-heading",
}: {
  eyebrow: string;
  activeHref?: string;
  statusLabel?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  className?: string;
  headingId?: string;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeHref, setActiveHref] = useState(activeHrefProp ?? "");

  // Derive the active route on the client so every page highlights correctly
  // without prop drilling. An explicit activeHref (e.g. the malware report page)
  // always wins.
  useEffect(() => {
    if (activeHrefProp) {
      setActiveHref(activeHrefProp);
      return;
    }
    if (typeof window !== "undefined") {
      const path = window.location.pathname.replace(/\/+$/, "") || "/";
      setActiveHref(path);
    }
  }, [activeHrefProp]);

  // Escape closes the drawer; keyboard-accessible and focus-safe.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <main className={className ? `intelligence-app ${className}` : "intelligence-app"}>
      <aside className={`intelligence-sidebar${drawerOpen ? " open" : ""}`}>
        <div className="intelligence-brand">
          <a href={routes.home.href}>
            <span>
              ZAYRON-<b>X</b>
            </span>
          </a>
          <small>ANALYST WORKSPACE</small>
        </div>
        <IntelligenceNavPanel activeHref={activeHref} onNavigate={() => setDrawerOpen(false)} />
      </aside>
      {drawerOpen && (
        <button className="sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />
      )}
      <div className="intelligence-main">
        <header className="intelligence-header">
          <button
            className="sidebar-toggle"
            type="button"
            aria-label="Open intelligence navigation"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            ☰
          </button>
          <div>
            <span className="workspace-breadcrumb">{eyebrow}</span>
            <strong>CONNECTED WORKSPACE</strong>
          </div>
          {headerExtra ?? <SearchTrigger />}
        </header>
        <section className="intelligence-content" aria-labelledby={headingId} data-status-label={statusLabel}>
          {children}
        </section>
      </div>
    </main>
  );
}
