"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "dark" | "light" | "auto";
      size?: "normal" | "compact";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ): string;
  reset(widgetId?: string): void;
}

type StripMode = "daily" | "critical_kev";

export function IntelAlertStrip({
  turnstileSiteKey = "",
  contained = false,
}: {
  turnstileSiteKey?: string;
  contained?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<StripMode>("daily");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstileValue, setTurnstileValue] = useState("");

  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!turnstileSiteKey) return;
    let cancelled = false;

    const mount = () => {
      const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      const container = turnstileRef.current;
      if (cancelled || !api || !container || turnstileWidgetId.current) return;
      container.innerHTML = "";
      turnstileWidgetId.current = api.render(container, {
        sitekey: turnstileSiteKey,
        theme: "dark",
        size: "compact",
        callback: (token: string) => {
          setTurnstileValue(token);
          setErrorMessage(null);
        },
        "expired-callback": () => setTurnstileValue(""),
        "error-callback": () => setTurnstileValue(""),
      });
    };

    const existing = document.querySelector<HTMLScriptElement>("script[data-zayron-turnstile]");
    if (existing) {
      if ((window as unknown as { turnstile?: TurnstileApi }).turnstile) mount();
      else existing.addEventListener("load", mount);
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.zayronTurnstile = "true";
    script.addEventListener("load", mount);
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [turnstileSiteKey]);

  const resetTurnstile = useCallback(() => {
    setTurnstileValue("");
    const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
    if (api && turnstileWidgetId.current) {
      try {
        api.reset(turnstileWidgetId.current);
      } catch {
        /* widget unmounted */
      }
    }
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (turnstileSiteKey && !turnstileValue) {
        setErrorMessage("Complete the verification check before subscribing.");
        return;
      }
      setSubmitting(true);
      setStatusMessage(null);
      setErrorMessage(null);
      try {
        const res = await fetch("/api/v1/briefings/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            frequency: "daily",
            focus: mode === "critical_kev" ? "critical_kev" : "all",
            turnstile_token: turnstileSiteKey ? turnstileValue : undefined,
          }),
        });
        const payload = (await res.json().catch(() => null)) as
          | { ok?: boolean; error?: { message?: string } }
          | null;
        if (!res.ok || !payload?.ok) {
          setErrorMessage(payload?.error?.message || `Subscription failed (HTTP ${res.status})`);
        } else {
          setStatusMessage("Subscribed. Daily verified briefings will arrive at 09:40 UTC.");
          setEmail("");
        }
      } catch {
        setErrorMessage("Subscription request failed. Please try again.");
      } finally {
        setSubmitting(false);
        if (turnstileSiteKey) resetTurnstile();
      }
    },
    [email, mode, resetTurnstile, turnstileSiteKey, turnstileValue],
  );

  return (
    <section
      className="ioc-table-section"
      aria-label="Threat intelligence briefing alerts"
      style={{
        marginTop: 28,
        marginBottom: contained ? 36 : 0,
        maxWidth: contained ? 1100 : "100%",
        marginInline: contained ? "auto" : undefined,
        paddingInline: contained ? "clamp(16px, 4vw, 32px)" : undefined,
        boxSizing: "border-box",
        overflowX: "clip",
      }}
    >
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(13,13,12,0.72)",
          padding: "18px 20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
          gap: 20,
          alignItems: "center",
          boxSizing: "border-box",
          maxWidth: "100%",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--color-accent)", marginBottom: 6 }}>
            EMAIL INTELLIGENCE BRIEFINGS
          </div>
          <p className="ioc-note" style={{ margin: "0 0 12px" }}>
            Daily 09:40 UTC summary of verified KEV additions, supply-chain advisories, and newsroom briefs.
          </p>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10, minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="secops@organization.com"
                aria-label="Work email for intelligence briefings"
                style={{
                  flex: "1 1 180px",
                  minWidth: 0,
                  maxWidth: "100%",
                  padding: "9px 12px",
                  background: "#070706",
                  color: "var(--color-text)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
              <button
                type="submit"
                className="ioc-cta"
                disabled={submitting}
                style={{ cursor: submitting ? "wait" : "pointer", whiteSpace: "nowrap" }}
              >
                {submitting ? "SUBSCRIBING..." : "SUBSCRIBE"}
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className="ioc-cta"
                onClick={() => setMode("daily")}
                aria-pressed={mode === "daily"}
                style={
                  mode === "daily"
                    ? { borderColor: "var(--color-accent)", color: "var(--color-accent)", cursor: "pointer" }
                    : { cursor: "pointer" }
                }
              >
                Daily Brief
              </button>
              <button
                type="button"
                className="ioc-cta"
                onClick={() => setMode("critical_kev")}
                aria-pressed={mode === "critical_kev"}
                style={
                  mode === "critical_kev"
                    ? { borderColor: "var(--color-accent)", color: "var(--color-accent)", cursor: "pointer" }
                    : { cursor: "pointer" }
                }
              >
                Critical KEV
              </button>
            </div>
            {turnstileSiteKey ? (
              <div ref={turnstileRef} style={{ maxWidth: "100%", overflow: "hidden" }} />
            ) : null}
            {statusMessage ? (
              <p className="ioc-note" role="status" style={{ color: "#2ecc71", margin: 0 }}>
                {statusMessage}
              </p>
            ) : null}
            {errorMessage ? (
              <p className="ioc-note" role="alert" style={{ color: "#ff4d2e", margin: 0 }}>
                {errorMessage}
              </p>
            ) : null}
          </form>
        </div>

        <div
          style={{
            minWidth: 0,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 14,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--color-subtle)" }}>
            REAL-TIME WIRE &amp; SYNDICATION
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "var(--color-text)", lineHeight: 1.45 }}>
            Get zero-day KEV &amp; supply-chain alerts the second they drop.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a
              className="ioc-cta"
              href="https://t.me/zayronxai"
              target="_blank"
              rel="noopener noreferrer"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)" }}
            >
              TELEGRAM LIVE WIRE (@zayronxai) ↗
            </a>
            <a className="ioc-cta" href="/news/rss.xml">
              RSS 2.0 FEED (/news/rss.xml)
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
