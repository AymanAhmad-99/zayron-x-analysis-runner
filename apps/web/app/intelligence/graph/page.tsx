import type { Metadata } from "next";
import { ControlledSurface } from "../../components/ControlledSurface";

/** Wave 4B — placeholder surface: never indexed, never listed in the sitemap. */
export const metadata: Metadata = {
  title: "Relationship graph",
  robots: { index: false, follow: false },
};

export default function GraphPage() { return <ControlledSurface title="Relationship graph" description="Representative relationship graph surface; live backend relationships are not yet integrated." />; }
