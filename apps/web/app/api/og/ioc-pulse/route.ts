import { getIocStats } from "../../../lib/api";
import { ogCardResponse } from "../../../lib/ogCard";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getIocStats();
  const stats = result.data;
  const topFamily = stats?.top_families_24h?.[0]?.family ?? null;

  return ogCardResponse({
    badge: "ACTIVE IOC CLUSTER",
    title: "LIVE IOC PULSE",
    subtitle: [
      topFamily ? `TOP FAMILY · ${String(topFamily).toUpperCase()}` : "NO RESOLVED FAMILY CLUSTER",
      stats?.latest_radar_pulse?.pulse_date ? `RADAR · ${stats.latest_radar_pulse.pulse_date}` : "RADAR PULSE PENDING",
    ].join("  ·  "),
    cells: [
      { label: "ACTIVE IOCS", value: String(stats?.active_total ?? 0) },
      { label: "EDL READY", value: String(stats?.edl_ready ?? 0) },
      { label: "TOP FAMILY", value: topFamily ? String(topFamily) : "NONE" },
      { label: "OPENSSF", value: String(stats?.openssf_dossiers ?? 0) },
    ],
  });
}
