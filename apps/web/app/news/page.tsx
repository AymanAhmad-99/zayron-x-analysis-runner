import type { Metadata } from "next";
import { ControlledSurface } from "../components/ControlledSurface";

/** Wave 4B — placeholder surface: never indexed, never listed in the sitemap. */
export const metadata: Metadata = {
  title: "News",
  robots: { index: false, follow: false },
};

export default function NewsPage() { return <ControlledSurface title="News" description="News intelligence workspace is being connected to the live intelligence layer." />; }
