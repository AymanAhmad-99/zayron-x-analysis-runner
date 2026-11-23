import type { Metadata } from "next";
import { RelationshipList } from "../../components/RelationshipList";

/** Wave 4B — orphan route: reachable, never linked from launch nav, never indexed. */
export const metadata: Metadata = {
  title: "Relationships",
  robots: { index: false, follow: false },
};

export default function RelationshipsPage() { return <RelationshipList />; }
