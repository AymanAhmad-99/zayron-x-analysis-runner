"use client";

import { useState } from "react";
import { ANNUAL_DISCOUNT_PERCENT, PLANS, planPrice, type BillingCycle, type Plan } from "./pricingData";

function CheckMark() {
  return (
    <svg className="zx-check" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M3 8.4l3.1 3.1L13 4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlanCard({ plan, cycle }: { plan: Plan; cycle: BillingCycle }) {
  const price = planPrice(plan, cycle);
  const suffix = plan.monthly === 0 ? "forever" : cycle === "annual" ? "per month billed annually" : "per month";

  return (
    <article className={`zx-card${plan.recommended ? " zx-card--rec" : ""}`} aria-labelledby={`zx-plan-${plan.id}`}>
      <div className="zx-card-head">
        <h2 className="zx-plan-name" id={`zx-plan-${plan.id}`}>
          {plan.name}
        </h2>
        {plan.recommended ? <span className="zx-badge">Recommended</span> : null}
      </div>
      <p className="zx-persona">{plan.persona}</p>
      <p className="zx-price">
        <span className="zx-price-amount zx-num">${price}</span>
        <span className="zx-price-unit">{suffix}</span>
      </p>
      {cycle === "annual" && plan.monthly > 0 ? (
        <p className="zx-price-note zx-num">
          ${price * 12} billed annually. ${plan.monthly} monthly.
        </p>
      ) : (
        <p className="zx-price-note">{plan.monthly === 0 ? "No card, no account, no expiry." : "Billed monthly. Cancel anytime."}</p>
      )}
      {plan.inheritsFrom ? <p className="zx-inherits">{plan.inheritsFrom}</p> : <p className="zx-inherits">Core platform access</p>}
      <ul className="zx-features">
        {plan.highlights.map((feature) => (
          <li key={feature}>
            <CheckMark />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <a
        className={`zx-cta${plan.recommended ? " zx-cta--primary" : ""}`}
        href={plan.href}
        aria-label={`${plan.name} plan: ${plan.cta}`}
      >
        {plan.cta}
        <span aria-hidden="true">→</span>
      </a>
    </article>
  );
}

/**
 * Billing toggle and the three plan cards. The only client state is the cycle;
 * both labels exist in the DOM so the toggle never changes layout height.
 */
export function PricingPlans() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <section className="zx-plans shell" aria-labelledby="zx-plans-heading">
      <h2 className="zx-sr" id="zx-plans-heading">
        Self-serve plans
      </h2>
      <div className="zx-billing-row">
        <div className="zx-billing" role="group" aria-label="Billing cycle">
          <button
            type="button"
            aria-pressed={cycle === "monthly"}
            className="zx-billing-option"
            onClick={() => setCycle("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            aria-pressed={cycle === "annual"}
            className="zx-billing-option"
            onClick={() => setCycle("annual")}
          >
            Annual
          </button>
        </div>
        <span className="zx-save zx-num">Save {ANNUAL_DISCOUNT_PERCENT}%</span>
        <p className="zx-billing-note zx-num" aria-live="polite">
          {cycle === "annual" ? "$19 → $15/mo. $39 → $31/mo." : "$19/mo. $39/mo."}
        </p>
      </div>

      <div className="zx-grid">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} cycle={cycle} />
        ))}
      </div>
    </section>
  );
}
