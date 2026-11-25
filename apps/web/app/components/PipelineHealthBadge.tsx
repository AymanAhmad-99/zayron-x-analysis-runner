"use client";

import { useEffect, useState } from "react";
import { getPipelineHealth, type PipelineHealth } from "../lib/api";

function formatUtc(value: string | null): string {
  if (!value) return "pending";
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
  if (Number.isNaN(parsed.getTime())) return "pending";
  return `${parsed.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/**
 * PHASE 7D — a single subtle line, not a dashboard: the badge only claims what
 * `/api/v1/health/pipeline` actually returned, and says "unavailable" when the
 * read fails rather than inventing a healthy state.
 */
export function PipelineHealthBadge() {
  const [health, setHealth] = useState<PipelineHealth | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getPipelineHealth().then((result) => {
      if (!active) return;
      if (result.data) setHealth(result.data);
      else setFailed(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const healthy = health?.healthy === true;
  const label = failed
    ? "PIPELINE STATUS UNAVAILABLE"
    : health
      ? healthy
        ? "PIPELINE HEALTHY"
        : "PIPELINE PARTIAL"
      : "CHECKING PIPELINE";
  const tone = failed ? "unknown" : health ? (healthy ? "ok" : "warn") : "unknown";

  return (
    <p className={`pipeline-badge pipeline-badge-${tone}`} role="status">
      <span className="pipeline-badge-dot" aria-hidden="true" />
      <strong>{label}</strong>
      {health ? <span> · Last verified {formatUtc(health.last_verified_at)}</span> : null}
    </p>
  );
}
