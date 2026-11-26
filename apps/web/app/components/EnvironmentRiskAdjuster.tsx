"use client";
import { useState } from "react";
import { adjustedRisk, type Controls, type Criticality } from "../lib/riskAdjuster";

/**
 * PHASE 8A — instant Environment Risk Adjuster.
 *
 * Three answers recompute an adjusted P0–P3 band and its SLA window entirely in
 * the browser: no request, no persistence, no server cost. The base band always
 * stays visible so the operator can see what the environment changed.
 */
export function EnvironmentRiskAdjuster({ base }: { base: string }) {
  const [internetFacing, setInternetFacing] = useState(false);
  const [controls, setControls] = useState<Controls>("none");
  const [criticality, setCriticality] = useState<Criticality>("standard");
  const result = adjustedRisk(base, { internetFacing, controls, criticality });

  return (
    <section className="risk-adjuster" aria-label="Environment risk adjuster">
      <div className="risk-adjuster-head">
        <h3>Environment Risk Adjuster</h3>
        <small>Computed in your browser · nothing is sent</small>
      </div>

      <div className="risk-adjuster-controls">
        <label className="risk-toggle">
          <span>Internet-facing asset</span>
          <button
            type="button"
            role="switch"
            aria-checked={internetFacing}
            className={internetFacing ? "risk-switch on" : "risk-switch"}
            onClick={() => setInternetFacing((value) => !value)}
          >
            {internetFacing ? "YES" : "NO"}
          </button>
        </label>

        <label className="risk-select">
          <span>Compensating controls / WAF</span>
          <select value={controls} onChange={(event) => setControls(event.target.value as Controls)}>
            <option value="none">None</option>
            <option value="partial">Partial</option>
            <option value="strict">Strict</option>
          </select>
        </label>

        <label className="risk-select">
          <span>Asset criticality</span>
          <select value={criticality} onChange={(event) => setCriticality(event.target.value as Criticality)}>
            <option value="standard">Standard</option>
            <option value="high">High</option>
            <option value="mission-critical">Mission-Critical</option>
          </select>
        </label>
      </div>

      <div className="risk-adjuster-result" aria-live="polite">
        <div>
          <small>ADJUSTED LOCAL PRIORITY</small>
          <strong className={`risk-priority p${result.priority.slice(1)}`}>{result.priority}</strong>
        </div>
        <div>
          <small>REMEDIATION SLA</small>
          <strong>{result.sla}</strong>
        </div>
        <div>
          <small>BASE BAND</small>
          <strong className="muted">{result.base}</strong>
        </div>
      </div>
      <p className="risk-adjuster-rationale">{result.rationale.join(" · ")}</p>
    </section>
  );
}
