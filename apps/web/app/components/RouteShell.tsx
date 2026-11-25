import type { ReactNode } from "react";
import { IntelligenceShellFrame } from "./IntelligenceShellFrame";
import { isPreviewDeployment } from "../lib/siteConfig";

const DEFAULT_NOTICE =
  "Intelligence may be incomplete, conflicting, stale, or revised. Capability is not execution; classification is not attribution.";

/**
 * The status pill is a workspace affordance, not an environment label.
 *
 * It used to default to "PREVIEW WORKSPACE" everywhere, which leaked preview
 * vocabulary onto the production surface. The default is now resolved per
 * render from the same preview signal the metadata uses.
 */
function DEFAULT_STATUS_LABEL(): string {
  return isPreviewDeployment() ? "PREVIEW WORKSPACE" : "LIVE INTELLIGENCE";
}

export function RouteShell({
  title,
  eyebrow,
  description,
  identifier,
  statusLabel,
  activeHref,
  contextNotice,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  identifier?: string;
  statusLabel?: string;
  activeHref?: string;
  contextNotice?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <IntelligenceShellFrame eyebrow={eyebrow} statusLabel={statusLabel} activeHref={activeHref}>
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          {identifier && (
            <span
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                color: "var(--color-accent)",
                fontSize: "14px",
                letterSpacing: ".05em",
              }}
            >
              {identifier}
            </span>
          )}
          <h1 id="route-heading">{title}</h1>
          <p>{description}</p>
        </div>
        <span className="workspace-status">
          <i />
          {statusLabel ?? DEFAULT_STATUS_LABEL()}
        </span>
      </div>
      {children ?? (
        <div className="workspace-state">
          <strong>{title.toUpperCase()}</strong>
          <span>This workspace is being connected to the live intelligence layer.</span>
        </div>
      )}
      <div className="legal-inline-notice" role="note">
        <p>{contextNotice ?? DEFAULT_NOTICE}</p>
        <nav aria-label="Related policies">
          <a href="/legal">Intelligence disclaimer</a>
          <a href="/malware-handling">Malware handling</a>
          <a href="/methodology">Methodology &amp; Governance</a>
        </nav>
      </div>
    </IntelligenceShellFrame>
  );
}
