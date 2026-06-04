import { getDb, maskDatabaseUrl } from "../index";
import { cves } from "../schema";
import { eq, desc, sql } from "drizzle-orm";
import type { CVE } from "../schema";

const PAGE_SIZE = 25;

function handleQueryError(error: unknown, functionName: string) {
  const maskedUrl = maskDatabaseUrl(process.env.DATABASE_URL || "");
  console.error(`DB Error in ${functionName} (DATABASE_URL: ${maskedUrl}):`, error);
}

/* ---- All CVEs paginated ---- */
export async function getCVEs(page = 1, pageSize = PAGE_SIZE) {
  try {
    const offset = (page - 1) * pageSize;
    return await getDb()
      .select()
      .from(cves)
      .orderBy(desc(cves.publishedDate))
      .limit(pageSize)
      .offset(offset);
  } catch (error) {
    handleQueryError(error, "getCVEs");
    return [] as CVE[];
  }
}

/* ---- Single CVE by cve_id ---- */
export async function getCVEById(cveId: string) {
  try {
    const result = await getDb()
      .select()
      .from(cves)
      .where(eq(cves.cveId, cveId.toUpperCase()))
      .limit(1);
    return result[0] ?? null;
  } catch (error) {
    handleQueryError(error, "getCVEById");
    return null;
  }
}

/* ---- CVEs by severity ---- */
export async function getCVEsBySeverity(severity: string, limit = 10) {
  try {
    return await getDb()
      .select()
      .from(cves)
      .where(sql`LOWER(${cves.severity}) = LOWER(${severity})`)
      .orderBy(desc(cves.cvssScore))
      .limit(limit);
  } catch (error) {
    handleQueryError(error, "getCVEsBySeverity");
    return [] as CVE[];
  }
}

/* ---- Latest critical CVEs ---- */
export async function getCriticalCVEs(limit = 5) {
  try {
    return await getDb()
      .select()
      .from(cves)
      .where(sql`LOWER(${cves.severity}) = 'critical'`)
      .orderBy(desc(cves.publishedDate))
      .limit(limit);
  } catch (error) {
    handleQueryError(error, "getCriticalCVEs");
    return [] as CVE[];
  }
}

/* ---- CVEs by vendor ---- */
export async function getCVEsByVendor(vendor: string, limit = 20) {
  try {
    return await getDb()
      .select()
      .from(cves)
      .where(sql`LOWER(${cves.vendor}) LIKE LOWER(${`%${vendor}%`})`)
      .orderBy(desc(cves.cvssScore))
      .limit(limit);
  } catch (error) {
    handleQueryError(error, "getCVEsByVendor");
    return [] as CVE[];
  }
}

/* ---- Search CVEs ---- */
export async function searchCVEs(query: string, limit = 20) {
  try {
    return await getDb()
      .select()
      .from(cves)
      .where(
        sql`to_tsvector('english', COALESCE(${cves.description}, '') || ' ' || ${cves.cveId}) @@ plainto_tsquery('english', ${query})`
      )
      .orderBy(desc(cves.cvssScore))
      .limit(limit);
  } catch (error) {
    handleQueryError(error, "searchCVEs");
    return [] as CVE[];
  }
}

/* ---- Total CVE count ---- */
export async function getCVECount() {
  try {
    const result = await getDb()
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(cves);
    return result[0]?.count ?? 0;
  } catch (error) {
    handleQueryError(error, "getCVECount");
    return 0;
  }
}

/* ---- Severity distribution ---- */
export async function getCVESeverityDistribution() {
  try {
    return await getDb()
      .select({
        severity: cves.severity,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(cves)
      .groupBy(cves.severity)
      .orderBy(desc(sql`count`));
  } catch (error) {
    handleQueryError(error, "getCVESeverityDistribution");
    return [] as Array<{ severity: string; count: number }>;
  }
}

/* ---- Recent CVEs (for homepage ticker) ---- */
export async function getRecentCVEs(limit = 20) {
  try {
    return await getDb()
      .select()
      .from(cves)
      .orderBy(desc(cves.publishedDate))
      .limit(limit);
  } catch (error) {
    handleQueryError(error, "getRecentCVEs");
    return [] as CVE[];
  }
}

/* ---- All CVE IDs for static generation ---- */
export async function getAllCVEIds(limit = 1000) {
  try {
    const result = await getDb()
      .select({ cveId: cves.cveId })
      .from(cves)
      .orderBy(desc(cves.publishedDate))
      .limit(limit);
    return result.map((r) => r.cveId);
  } catch (error) {
    handleQueryError(error, "getAllCVEIds");
    return [] as string[];
  }
}

/* ---- Admin: update CVE ---- */
export async function updateCVE(id: string, data: Partial<typeof cves.$inferInsert>) {
  try {
    return await getDb().update(cves).set(data).where(eq(cves.id, id));
  } catch (error) {
    handleQueryError(error, "updateCVE");
    throw error;
  }
}

/* ---- Admin: delete CVE ---- */
export async function deleteCVE(id: string) {
  try {
    return await getDb().delete(cves).where(eq(cves.id, id));
  } catch (error) {
    handleQueryError(error, "deleteCVE");
    throw error;
  }
}
