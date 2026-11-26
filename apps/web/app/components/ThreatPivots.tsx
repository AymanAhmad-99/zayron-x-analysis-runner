import { threatPivots } from "../lib/detectionAsCode";

/**
 * PHASE 8A — safe 1-click external pivots on an IOC lookup result.
 *
 * The anchor always points at one of three vetted lookup services
 * (VirusTotal, Shodan, GreyNoise) with `noopener noreferrer nofollow`. It never
 * points at the indicator, and the indicator itself is only ever rendered
 * defanged elsewhere in the workspace.
 */
export function ThreatPivots({ value }: { value: string }) {
  const pivots = threatPivots(value);
  if (pivots.length === 0) return null;
  return (
    <div className="ioc-pivots" aria-label="External threat pivots">
      <span className="ioc-pivots-label">PIVOT</span>
      {pivots.map((pivot) => (
        <a
          key={pivot.name}
          href={pivot.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="ioc-pivot"
        >
          {pivot.name} ↗
        </a>
      ))}
    </div>
  );
}
