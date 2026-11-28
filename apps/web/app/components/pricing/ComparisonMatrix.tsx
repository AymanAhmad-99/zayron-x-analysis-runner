"use client";

import { useState, type ReactNode } from "react";
import { MATRIX, PLANS, type Cell } from "./pricingData";

function Tick() {
  return (
    <svg className="zx-check" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M3 8.4l3.1 3.1L13 4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Value({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <span className="zx-val zx-val--yes">
        <Tick />
        <span className="zx-sr">Included</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="zx-val zx-val--no" aria-label="Not included">
        —
      </span>
    );
  }
  return <span className={`zx-val zx-val--text${/\d/.test(value) ? " zx-num" : ""}`}>{value}</span>;
}

function RowLabel({ label, hint, id }: { label: string; hint?: string; id: string }) {
  if (!hint) return <span className="zx-row-label">{label}</span>;
  const tipId = `${id}-tip`;
  return (
    <span className="zx-tip" tabIndex={0} aria-describedby={tipId}>
      {label}
      <span className="zx-tip-bubble" aria-hidden="true">
        {hint}
      </span>
      <span className="zx-sr" id={tipId}>
        {hint}
      </span>
    </span>
  );
}

/**
 * Desktop is a four column table with sticky tier headers. Under 768px the table
 * is replaced by stacked category cards driven by a sticky plan switcher, so a
 * 412px viewport never scrolls horizontally.
 */
export function ComparisonMatrix() {
  const [active, setActive] = useState(0);

  return (
    <section className="zx-compare shell" aria-labelledby="zx-compare-heading">
      <div className="zx-section-head">
        <h2 id="zx-compare-heading">Compare every capability</h2>
        <p>Quotas and limits are contractual. No feature is withheld from a lower tier to force an upgrade path.</p>
      </div>

      <div className="zx-mobile-tabs" role="group" aria-label="Compare plans">
        {PLANS.map((plan, index) => (
          <button
            key={plan.id}
            type="button"
            aria-pressed={active === index}
            className="zx-mobile-tab"
            onClick={() => setActive(index)}
          >
            {plan.name}
          </button>
        ))}
      </div>

      <div className="zx-table-wrap" role="region" aria-label="Plan capability comparison" tabIndex={0}>
        <table className="zx-table">
          <caption className="zx-sr">Plan capability comparison for Free, Analyst and Operator</caption>
          <thead>
            <tr>
              <th scope="col" className="zx-th-label">
                Capability
              </th>
              {PLANS.map((plan) => (
                <th scope="col" key={plan.id} className={plan.recommended ? "zx-th zx-th--rec" : "zx-th"}>
                  <span className="zx-th-name">{plan.name}</span>
                  <span className="zx-th-price zx-num">${plan.monthly}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((group) => (
              <FragmentGroup key={group.id} id={group.id} title={group.title}>
                {group.rows.map((row) => (
                  <tr key={row.label} className="zx-tr">
                    <th scope="row">
                      <RowLabel label={row.label} hint={row.hint} id={`${group.id}-${row.label}`} />
                    </th>
                    {row.values.map((value, index) => (
                      <td key={PLANS[index].id}>
                        <Value value={value} />
                      </td>
                    ))}
                  </tr>
                ))}
              </FragmentGroup>
            ))}
          </tbody>
        </table>
      </div>

      <div className="zx-mobile-cards">
        {MATRIX.map((group) => (
          <section className="zx-mobile-group" key={group.id} aria-labelledby={`zx-m-${group.id}`}>
            <h3 id={`zx-m-${group.id}`}>{group.title}</h3>
            <dl>
              {group.rows.map((row) => (
                <div className="zx-mobile-row" key={row.label}>
                  <dt>
                    <RowLabel label={row.label} hint={row.hint} id={`m-${group.id}-${row.label}`} />
                  </dt>
                  <dd>
                    <Value value={row.values[active]} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </section>
  );
}

/** `<tbody>` may not be nested per group, so a group header row + rows is emitted as a fragment. */
function FragmentGroup({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <>
      <tr className="zx-group-row">
        <th scope="colgroup" colSpan={4} id={`zx-group-${id}`}>
          {title}
        </th>
      </tr>
      {children}
    </>
  );
}
