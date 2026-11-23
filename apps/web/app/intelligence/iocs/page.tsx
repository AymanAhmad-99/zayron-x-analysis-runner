import type { Metadata } from "next";
import { IocList } from "../../components/IocList";

export const metadata: Metadata = {
  title: "Indicators of compromise",
  description: "Observed indicators of compromise with their originating intelligence events.",
  alternates: { canonical: "/intelligence/iocs" },
};

export default function IocsPage() { return <IocList />; }
