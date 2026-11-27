"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

/**
 * PHASE 10A — homepage Enterprise & Intelligence Inquiry.
 *
 * Three validated fields, Turnstile protection identical to `IntelAlertStrip`,
 * and one POST to `/api/v1/inquiries`. The inquiry is persisted in D1 and routed
 * to intel@zayron-x.co with the submitter as reply-to, so the confirmation copy
 * below is a real receipt — never a local-only state flip.
 */

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId?: string): void;
  remove?(widgetId?: string): void;
}

const COMPANY_MIN = 2;
const COMPANY_MAX = 120;
const INQUIRY_MIN = 10;
const INQUIRY_MAX = 2000;

export function EnterpriseInquiry({ turnstileSiteKey = "" }: { turnstileSiteKey?: string }) {
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [inquiry, setInquiry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
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
      setErrorMessage(null);

      const trimmedCompany = company.trim();
      const trimmedEmail = email.trim();
      const trimmedInquiry = inquiry.trim();

      if (trimmedCompany.length < COMPANY_MIN || trimmedCompany.length > COMPANY_MAX) {
        setErrorMessage(`Company name must be between ${COMPANY_MIN} and ${COMPANY_MAX} characters.`);
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
        setErrorMessage("Enter a valid work email address.");
        return;
      }
      if (trimmedInquiry.length < INQUIRY_MIN || trimmedInquiry.length > INQUIRY_MAX) {
        setErrorMessage(`Tell us a little more — between ${INQUIRY_MIN} and ${INQUIRY_MAX} characters.`);
        return;
      }
      if (turnstileSiteKey && !turnstileValue) {
        setErrorMessage("Complete the verification check below before sending.");
        return;
      }

      setSubmitting(true);
      try {
        const response = await fetch("/api/v1/inquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: trimmedCompany,
            email: trimmedEmail,
            inquiry: trimmedInquiry,
            turnstile_token: turnstileSiteKey ? turnstileValue : undefined,
          }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; reference_id?: string; error?: { message?: string } }
          | null;
        if (!response.ok || !payload?.ok || !payload.reference_id) {
          setErrorMessage(payload?.error?.message || `Inquiry could not be sent (HTTP ${response.status}).`);
          return;
        }
        setReference(payload.reference_id);
        setCompany("");
        setEmail("");
        setInquiry("");
      } catch {
        setErrorMessage("The inquiry service is unreachable. Try again shortly.");
      } finally {
        setSubmitting(false);
        if (turnstileSiteKey) resetTurnstile();
      }
    },
    [company, email, inquiry, resetTurnstile, turnstileSiteKey, turnstileValue],
  );

  return (
    <section className="inquiry shell" id="contact" aria-labelledby="inquiry-heading">
      <div className="inquiry-copy">
        <p className="eyebrow">ENTERPRISE &amp; INTELLIGENCE INQUIRY</p>
        <h2 id="inquiry-heading">Talk to the intelligence desk.</h2>
        <p>
          Brief the analysts on the signal you are tracking. Every inquiry is read by the desk that maintains the
          catalog — not a sales queue.
        </p>
        <dl className="inquiry-meta">
          <div>
            <dt>Response</dt>
            <dd>1 business day</dd>
          </div>
          <div>
            <dt>Reaches</dt>
            <dd>intel@zayron-x.co</dd>
          </div>
          <div>
            <dt>Also open</dt>
            <dd>
              <a href="mailto:security@zayron-x.co">security@zayron-x.co</a>
            </dd>
          </div>
        </dl>
      </div>

      <div className="inquiry-card">
        {reference ? (
          <div className="inquiry-confirm" role="status" aria-live="polite">
            <span className="inquiry-confirm-label">INQUIRY RECEIVED</span>
            <p>
              Inquiry received (Ref: <code>{reference}</code>). Our intelligence desk will reply within 1 business
              day.
            </p>
            <p className="inquiry-note">A confirmation receipt has been sent to your work email.</p>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setReference(null);
                setErrorMessage(null);
              }}
            >
              Send another inquiry
            </button>
          </div>
        ) : (
          <form className="inquiry-form" onSubmit={handleSubmit} noValidate>
            <label className="inquiry-field">
              <span>Company name</span>
              <input
                type="text"
                required
                minLength={COMPANY_MIN}
                maxLength={COMPANY_MAX}
                autoComplete="organization"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="Acme Security"
              />
            </label>
            <label className="inquiry-field">
              <span>Work email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="security-lead@your-company.com"
              />
            </label>
            <label className="inquiry-field">
              <span>
                How can we help? <em>{inquiry.trim().length}/{INQUIRY_MAX}</em>
              </span>
              <textarea
                required
                rows={5}
                minLength={INQUIRY_MIN}
                maxLength={INQUIRY_MAX}
                value={inquiry}
                onChange={(event) => setInquiry(event.target.value)}
                placeholder="We are evaluating programmatic CVE and IOC enrichment for a 12-analyst SOC…"
              />
            </label>
            {turnstileSiteKey ? (
              <div ref={turnstileRef} className="inquiry-turnstile" data-sitekey={turnstileSiteKey} />
            ) : null}
            {turnstileError ? (
              <p className="inquiry-error" role="alert">
                {turnstileError}
              </p>
            ) : null}
            {errorMessage ? (
              <p className="inquiry-error" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <button
              type="submit"
              className="button primary inquiry-submit"
              disabled={submitting || (Boolean(turnstileSiteKey) && !turnstileValue)}
            >
              {submitting ? "Sending…" : "Send inquiry"}
            </button>
            <p className="inquiry-note">
              We use this only to answer your inquiry. No list, no resale, no marketing sequence.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
