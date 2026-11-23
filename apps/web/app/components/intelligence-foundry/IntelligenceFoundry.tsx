"use client";

import { useEffect, useRef, useState } from "react";
import { SignalPipeline } from "./SignalPipeline";

const stations = [
  ["01", "NEW SIGNAL", "A new observation enters the intelligence pipeline."],
  ["02", "NEW EVIDENCE", "Additional evidence strengthens or challenges the claim."],
  ["03", "NEW RELATIONSHIP", "Verified relationships connect entities and evidence."],
  ["04", "UPDATED ASSESSMENT", "The assessment changes as evidence and relationships evolve."],
] as const;

/**
 * Unified analytical narrative: what changed in the signal, and the
 * evidence discipline that grounds every assessment. The Live Signal
 * Pipeline is the single visual centerpiece for both ideas.
 */
export function IntelligenceFoundry() {
  return <section className="foundry-section shell" id="foundry" aria-labelledby="foundry-heading">
    <div className="foundry-copy">
      <div className="eyebrow">02 / ANALYTICAL STATE</div>
      <h2 id="foundry-heading">EVIDENCE FIRST. SEE WHAT CHANGED.</h2>
      <p>Every assessment begins with what can be traced, compared and challenged — and every signal evolves as evidence arrives, relationships emerge, and assessments are revised.</p>
      <p className="foundry-methodology">REPRESENTATIVE METHODOLOGY VISUALIZATION / NOT LIVE PRODUCTION DATA</p>
      <ol className="foundry-stations">{stations.map(([number, title, copy]) => <li key={number}><span>{number}</span><div><strong>{title}</strong><small>{copy}</small></div></li>)}</ol>
    </div>
    <div className="foundry-visual" aria-label="Live Signal Pipeline visualization">
      <SignalPipeline />
    </div>
  </section>;
}
