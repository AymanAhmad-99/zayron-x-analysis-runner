import type { Metadata } from "next";
import { ControlledSurface } from "../components/ControlledSurface";

/** Wave 4B — placeholder surface: never indexed, never listed in the sitemap. */
export const metadata: Metadata = {
  title: "Research",
  robots: { index: false, follow: false },
};

export default function ResearchPage() { return <ControlledSurface title="Research" description="Research workspace is being connected to the live intelligence layer." />; }
