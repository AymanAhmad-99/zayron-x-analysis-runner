"use client";

import { useEffect, useState } from "react";

/**
 * Live Signal Pipeline — refined 2D motion (SVG + CSS, no 3D).
 * One gradient timeline, 4 stage nodes, a traveling particle with
 * hold-at-node behavior, synced node flashes and stage labels,
 * ending in a confidence badge pulse before looping.
 */

const STAGES = ["New Signal", "New Evidence", "New Relationship", "Updated Assessment"];
const CYCLE_MS = 5600; // total loop: 4 legs of travel + holds
const HOLD_MS = 500;   // pause at each node
// Particle position timeline (ms → 0..1 progress across the line)
function particleProgress(t: number): number {
  const leg = (CYCLE_MS - HOLD_MS * 4) / 4; // travel time per leg
  let elapsed = 0;
  for (let i = 0; i < 4; i++) {
    if (t < elapsed + leg) {
      const p = (t - elapsed) / leg;
      return (i + easeInOut(p)) / 4; // ease-in-out per leg
    }
    elapsed += leg + HOLD_MS;
    if (t < elapsed) return (i + 1) / 4; // holding at node i+1
  }
  return 1;
}
function easeInOut(p: number) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

export function SignalPipeline() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => { setT((now - start) % CYCLE_MS); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const progress = particleProgress(t);
  const activeNode = Math.min(3, Math.floor(progress * 4 + 0.0001));
  const nearNode = Math.min(3, Math.round(progress * 4));
  const atNode = Math.abs(progress * 4 - Math.round(progress * 4)) < 0.04; // synced arrival window
  const cycleDone = progress > 0.995;
  // stage label shows ~1.5–2s: during arrival + hold + early travel of next leg
  const labelVisible = atNode || (progress > activeNode / 4 && progress < (activeNode + 0.75) / 4);

  return (
    <div className="signal-pipeline" role="img" aria-label="Live signal pipeline: new signal, new evidence, new relationship, updated assessment">
      <div className="pipeline-stage-labels" aria-hidden="true">
        {STAGES.map((label, i) => (
          <span key={label} className={`pipeline-label ${labelVisible && nearNode === i ? "visible" : ""}`} style={{ left: `${(i / 3) * 100}%` }}>{label}</span>
        ))}
      </div>
      <div className="pipeline-track">
        <div className="pipeline-line" />
        {STAGES.map((label, i) => (
          <div key={label} className={`pipeline-node ${nearNode === i && labelVisible ? "active" : ""}`} style={{ left: `${(i / 3) * 100}%` }} />
        ))}
        <div className="pipeline-particle" style={{ left: `${progress * 100}%` }} />
      </div>
      <div className={`pipeline-confidence ${cycleDone ? "pulse" : ""}`}>
        <span>CONFIDENCE</span><strong>0.91</strong><b>CONFIRMED</b><small>REPRESENTATIVE UI</small>
      </div>
    </div>
  );
}
