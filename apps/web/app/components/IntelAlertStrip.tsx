"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "dark" | "light" | "auto";
      size?: "normal" | "compact" | "flexible";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ): string;
  reset(widgetId?: string): void;
  remove?(widgetId?: string): void;
}

type StripCadence = "daily" | "weekly";

/**
 * PHASE 10A-POLISH — the briefing subscribe strip.
 *
 * Rebuilt on the site's own tokens: a `#0d0d0c` panel with a whisper of accent
 * ambient light, editorial copy on the left, and one unified dark control column
 * on the right. No raw white buttons, no off-brand blue surface. The Turnstile
 * gate, the reset-on-finish behaviour and the endpoint contract are unchanged.
 */
export function IntelAlertStrip({
  turnstileSiteKey = "",
  contained = false,
}: {
  turnstileSiteKey?: string;
  contained?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [cadence, setCadence] = useState<StripCadence>("daily");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstileValue, setTurnstileValue] = useState("");
  const [turnstileError, setTurnstileError] = useState<string | null>(null);

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
        size: "normal",
        callback: (token: string) => {
          setTurnstileValue(token);
          setTurnstileError(null);
          setErrorMessage(null);
        },
        "expired-callback": () => setTurnstileValue(""),
        "error-callback": () => {
          setTurnstileValue("");
          setTurnstileError("Bot verification could not be completed. Reload the page and try again.");
        },
      });
    };

    const existing = document.querySelector<HTMLScriptElement>("script[data-zayron-turnstile]");
    if (existing) {
      if ((window as unknown as { turnstile?: TurnstileApi }).turnstile) mount();
      else existing.addEventListener("load", mount);
      return () => {
        cancelled = true;
        existing.removeEventListener("load", mount);
        const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
        if (api?.remove && turnstileWidgetId.current) {
          try {
            api.remove(turnstileWidgetId.current);
          } catch {
            /* widget already removed */
          }
        }
        turnstileWidgetId.current = null;
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
      script.removeEventListener("load", mount);
      const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (api?.remove && turnstileWidgetId.current) {
        try {
          api.remove(turnstileWidgetId.current);
        } catch {
          /* widget already removed */
        }
      }
      turnstileWidgetId.current = null;
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
        setErrorMessage("Complete the verification check below before subscribing.");
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
            frequency: cadence,
            focus: "all",
            turnstile_token: turnstileSiteKey ? turnstileValue : undefined,
          }),
        });
        const payload = (await res.json().catch(() => null)) as
          | { ok?: boolean; error?: { message?: string } }
          | null;
        if (!res.ok || !payload?.ok) {
          setErrorMessage(payload?.error?.message || `Subscription failed (HTTP ${res.status})`);
        } else {
          setStatusMessage("Check your inbox — your ZAYRON-X Welcome Briefing is on the way.");
          setEmail("");
        }
      } catch {
        setErrorMessage("Subscription request failed. Please try again.");
      } finally {
        setSubmitting(false);
        if (turnstileSiteKey) resetTurnstile();
      }
    },
    [cadence, email, resetTurnstile, turnstileSiteKey, turnstileValue],
  );

  return (
    <section className={`ia${contained ? " ia-contained" : ""}`} aria-label="Threat intelligence briefing alerts">
      <div className="ia-panel">
        <div className="ia-copy">
          <span className="ia-eyebrow">Intelligence Briefing</span>
          <h2>Stay ahead of verified threats.</h2>
          <p>
            Curated CVE advisories, threat actor dossiers, and live KQL/SPL hunting updates — delivered cleanly to your
            inbox. Zero spam.
          </p>
          <div className="ia-wire">
            <a href="https://t.me/zayronxai" target="_blank" rel="noopener noreferrer">
              Telegram live wire ↗
            </a>
            <span aria-hidden="true">·</span>
            <a href="/news/rss.xml">RSS 2.0</a>
          </div>
        </div>

        <form className="ia-form" onSubmit={handleSubmit}>
          <div className="ia-segmented" role="group" aria-label="Briefing cadence">
            <button
              type="button"
              className={`ia-seg${cadence === "daily" ? " active" : ""}`}
              aria-pressed={cadence === "daily"}
              onClick={() => setCadence("daily")}
            >
              Daily
            </button>
            <button
              type="button"
              className={`ia-seg${cadence === "weekly" ? " active" : ""}`}
              aria-pressed={cadence === "weekly"}
              onClick={() => setCadence("weekly")}
            >
              Weekly
            </button>
          </div>

          <div className="ia-field">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="secops@organization.com"
              aria-label="Work email for intelligence briefings"
              autoComplete="email"
            />
            <button
              type="submit"
              className="ia-submit"
              disabled={submitting || (Boolean(turnstileSiteKey) && !turnstileValue)}
            >
              {submitting ? "Subscribing…" : "Subscribe"}
            </button>
          </div>

          {turnstileSiteKey ? <div ref={turnstileRef} className="ia-turnstile" data-sitekey={turnstileSiteKey} /> : null}

          {turnstileSiteKey && !turnstileValue && !turnstileError ? (
            <p className="ia-status">Verification keeps the wire clean — one check, no puzzles after it.</p>
          ) : null}
          {turnstileError ? (
            <p className="ia-status err" role="alert">
              {turnstileError}
            </p>
          ) : null}
          {statusMessage ? (
            <p className="ia-status ok" role="status">
              {statusMessage}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="ia-status err" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
