import { eq, desc, and, ilike, or, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { cves } from '../schema';
import type { CVE } from '@zayron/types';

function mapCVE(dbCVE: any): CVE {
  if (!dbCVE) return null as any;
  return {
    id: dbCVE.id,
    cveId: dbCVE.cveId,
    title: dbCVE.title,
    description: dbCVE.description,
    severity: dbCVE.severity,
    cvssScore: dbCVE.cvssScore,
    cvssVector: dbCVE.cvssVector,
    affectedProduct: dbCVE.affectedProduct,
    vendor: dbCVE.vendor,
    status: dbCVE.status,
    publishedDate: dbCVE.publishedDate,
    createdAt: dbCVE.createdAt,
    updatedAt: dbCVE.updatedAt || dbCVE.createdAt,
  };
}

export async function getCVEs(page = 1, pageSize = 25, env?: any) {
  const db = getDb(env);
  const offset = (page - 1) * pageSize;
  const data = await db.select().from(cves)
    .orderBy(desc(cves.publishedDate))
    .limit(pageSize)
    .offset(offset)
    .execute();
  return data.map(mapCVE);
}

export async function getCVEById(cveId: string, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(cves)
    .where(eq(cves.cveId, cveId.toUpperCase()))
    .limit(1)
    .execute();
  return data.length > 0 ? mapCVE(data[0]) : null;
}

export async function getCVEsBySeverity(severity: string, limit = 10, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(cves)
    .where(ilike(cves.severity, severity))
    .orderBy(desc(cves.cvssScore))
    .limit(limit)
    .execute();
  return data.map(mapCVE);
}

export async function getCriticalCVEs(limit = 5, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(cves)
    .where(ilike(cves.severity, 'critical'))
    .orderBy(desc(cves.publishedDate))
    .limit(limit)
    .execute();
  return data.map(mapCVE);
}

export async function getCVEsByVendor(vendor: string, limit = 20, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(cves)
    .where(ilike(cves.vendor, `%${vendor}%`))
    .orderBy(desc(cves.cvssScore))
    .limit(limit)
    .execute();
  return data.map(mapCVE);
}

export async function searchCVEs(query: string, limit = 20, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(cves)
    .where(or(ilike(cves.cveId, `%${query}%`), ilike(cves.description, `%${query}%`)))
    .orderBy(desc(cves.cvssScore))
    .limit(limit)
    .execute();
  return data.map(mapCVE);
}

export async function getCVECount(env?: any) {
  const db = getDb(env);
  const result = await db.select({ count: sql<number>`count(*)` }).from(cves).execute();
  return result[0]?.count || 0;
}

export async function getCVESeverityDistribution(env?: any) {
  const db = getDb(env);
  const data = await db.select({ severity: cves.severity }).from(cves).execute();
  const counts: Record<string, number> = {};
  for (const row of data) {
    const sev = row.severity || 'Unknown';
    counts[sev] = (counts[sev] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([severity, count]) => ({ severity, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getRecentCVEs(limit = 20, env?: any) {
  const db = getDb(env);
  const data = await db.select().from(cves)
    .orderBy(desc(cves.publishedDate))
    .limit(limit)
    .execute();
  return data.map(mapCVE);
}

export async function getAllCVEIds(limit = 1000, env?: any) {
  const db = getDb(env);
  const data = await db.select({ cveId: cves.cveId }).from(cves)
    .orderBy(desc(cves.publishedDate))
    .limit(limit)
    .execute();
  return data.map((r) => r.cveId);
}

export async function updateCVE(id: string, data: any, env?: any) {
  const db = getDb(env);
  const dbData: any = { ...data };
  
  // Drizzle column keys match camelCase schema definition
  const result = await db.update(cves).set(dbData).where(eq(cves.id, id)).returning().execute();
  return mapCVE(result[0]);
}

export async function deleteCVE(id: string, env?: any) {
  const db = getDb(env);
  await db.delete(cves).where(eq(cves.id, id)).execute();
}

export { getCVEs as getCves, getCVEById as getCveById, getCVECount as getCveCount };
