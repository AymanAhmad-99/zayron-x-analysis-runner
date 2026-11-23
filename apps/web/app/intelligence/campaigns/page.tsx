import type { Metadata } from "next";
import { CampaignList } from "../../components/CampaignList";

export const metadata: Metadata = {
  title: "Campaigns",
  description: "Tracked intrusion campaigns, targeted sectors and cited evidence.",
  alternates: { canonical: "/intelligence/campaigns" },
};

export default function CampaignsPage() { return <CampaignList />; }
