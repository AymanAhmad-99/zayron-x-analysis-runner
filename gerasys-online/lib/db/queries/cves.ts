import { db } from "../index";
import { cves } from "../schema";
import { eq, desc, sql } from "drizzle-orm";

const PAGE_SIZE = 25;

/* ---- All CVEs paginated ---- */
export async function getCVEs(page = 1, pageSize = PAGE_SIZE) {
  const offset = (page - 1) * pageSize;
  return db
    .select()
    .from(cves)
    .orderBy(desc(cves.publishedDate))
    .limit(pageSize)
    .offset(offset);
}

/* ---- Single CVE by cve_id ---- */
export async function getCVEById(cveId: string) {
  const result = await db
    .select()
    .from(cves)
    .where(eq(cves.cveId, cveId.toUpperCase()))
    .limit(1);
  return result[0] ?? null;
}

/* ---- CVEs by severity ---- */
export async function getCVEsBySeverity(severity: string, limit = 10) {
  return db
    .select()
    .from(cves)
    .where(sql`LOWER(${cves.severity}) = LOWER(${severity})`)
    .orderBy(desc(cves.cvssScore))
    .limit(limit);
}

/* ---- Latest critical CVEs ---- */
export async function getCriticalCVEs(limit = 5) {
  return db
    .select()
    .from(cves)
    .where(sql`LOWER(${cves.severity}) = 'critical'`)
    .orderBy(desc(cves.publishedDate))
    .limit(limit);
}

/* ---- CVEs by vendor ---- */
export async function getCVEsByVendor(vendor: string, limit = 20) {
  return db
    .select()
    .from(cves)
    .where(sql`LOWER(${cves.vendor}) LIKE LOWER(${`%${vendor}%`})`)
    .orderBy(desc(cves.cvssScore))
    .limit(limit);
}

/* ---- Search CVEs ---- */
export async function searchCVEs(query: string, limit = 20) {
  return db
    .select()
    .from(cves)
    .where(
      sql`to_tsvector('english', COALESCE(${cves.description}, '') || ' ' || ${cves.cveId}) @@ plainto_tsquery('english', ${query})`
    )
    .orderBy(desc(cves.cvssScore))
    .limit(limit);
}

/* ---- Total CVE count ---- */
export async function getCVECount() {
  const result = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(cves);
  return result[0]?.count ?? 0;
}

/* ---- Severity distribution ---- */
export async function getCVESeverityDistribution() {
  return db
    .select({
      severity: cves.severity,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(cves)
    .groupBy(cves.severity)
    .orderBy(desc(sql`count`));
}

/* ---- Recent CVEs (for homepage ticker) ---- */
export async function getRecentCVEs(limit = 20) {
  return db
    .select()
    .from(cves)
    .orderBy(desc(cves.publishedDate))
    .limit(limit);
}

/* ---- All CVE IDs for static generation ---- */
export async function getAllCVEIds(limit = 1000) {
  const result = await db
    .select({ cveId: cves.cveId })
    .from(cves)
    .orderBy(desc(cves.publishedDate))
    .limit(limit);
  return result.map((r) => r.cveId);
}

/* ---- Admin: update CVE ---- */
export async function updateCVE(id: string, data: Partial<typeof cves.$inferInsert>) {
  return db.update(cves).set(data).where(eq(cves.id, id));
}

/* ---- Admin: delete CVE ---- */
export async function deleteCVE(id: string) {
  return db.delete(cves).where(eq(cves.id, id));
}
