import { getDb } from "../index";
import type { CVE } from "../schema";

const PAGE_SIZE = 25;

function from() {
  return getDb().from("cves");
}

/* ---- All CVEs paginated ---- */
export async function getCVEs(page = 1, pageSize = PAGE_SIZE) {
  const offset = (page - 1) * pageSize;
  const { data } = await from()
    .select("*")
    .order("published_date", { ascending: false })
    .range(offset, offset + pageSize - 1);
  return (data ?? []) as CVE[];
}

/* ---- Single CVE by cve_id ---- */
export async function getCVEById(cveId: string) {
  const { data, error } = await from()
    .select("*")
    .eq("cve_id", cveId.toUpperCase())
    .limit(1)
    .single();
  if (error) return null;
  return data as CVE | null;
}

/* ---- CVEs by severity ---- */
export async function getCVEsBySeverity(severity: string, limit = 10) {
  const { data } = await from()
    .select("*")
    .ilike("severity", severity)
    .order("cvss_score", { ascending: false })
    .limit(limit);
  return (data ?? []) as CVE[];
}

/* ---- Latest critical CVEs ---- */
export async function getCriticalCVEs(limit = 5) {
  const { data } = await from()
    .select("*")
    .ilike("severity", "critical")
    .order("published_date", { ascending: false })
    .limit(limit);
  return (data ?? []) as CVE[];
}

/* ---- CVEs by vendor ---- */
export async function getCVEsByVendor(vendor: string, limit = 20) {
  const { data } = await from()
    .select("*")
    .ilike("vendor", `%${vendor}%`)
    .order("cvss_score", { ascending: false })
    .limit(limit);
  return (data ?? []) as CVE[];
}

/* ---- Search CVEs ---- */
export async function searchCVEs(query: string, limit = 20) {
  const searchTerm = `%${query.trim()}%`;
  const { data } = await from()
    .select("*")
    .or(`description.ilike.${searchTerm},cve_id.ilike.${searchTerm}`)
    .order("cvss_score", { ascending: false })
    .limit(limit);
  return (data ?? []) as CVE[];
}

/* ---- Total CVE count ---- */
export async function getCVECount() {
  const { count } = await from()
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

/* ---- Severity distribution ---- */
export async function getCVESeverityDistribution() {
  const { data } = await from().select("severity");

  if (!data) return [];

  const counts = new Map<string, number>();
  for (const row of data) {
    const sev = (row as Record<string, string>).severity;
    if (sev) counts.set(sev, (counts.get(sev) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([severity, count]) => ({ severity, count }))
    .sort((a, b) => b.count - a.count);
}

/* ---- Recent CVEs (for homepage ticker) ---- */
export async function getRecentCVEs(limit = 20) {
  const { data } = await from()
    .select("*")
    .order("published_date", { ascending: false })
    .limit(limit);
  return (data ?? []) as CVE[];
}

/* ---- All CVE IDs for static generation ---- */
export async function getAllCVEIds(limit = 1000) {
  const { data } = await from()
    .select("cve_id")
    .order("published_date", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Array<{ cve_id: string }>).map((r) => r.cve_id);
}

/* ---- Admin: update CVE ---- */
export async function updateCVE(id: string, data: Record<string, unknown>) {
  return from().update(data).eq("id", id);
}

/* ---- Admin: delete CVE ---- */
export async function deleteCVE(id: string) {
  return from().delete().eq("id", id);
}
