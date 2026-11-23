import { RouteShell } from "./RouteShell";
export function ControlledSurface({ title, description }: { title: string; description: string }) { return <RouteShell title={title} eyebrow={`INTELLIGENCE / ${title.toUpperCase()}`} description={description}><div className="workspace-state"><strong>{title.toUpperCase()}</strong><span>{description}</span></div></RouteShell>; }
