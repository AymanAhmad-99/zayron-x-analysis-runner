import { db } from "../index";
import { rawFeeds } from "../schema";
import { eq, desc, sql } from "drizzle-orm";

export async function getRawFeeds(page = 1, pageSize = 50) {
  const offset = (page - 1) * pageSize;
  return db
    .select()
    .from(rawFeeds)
    .orderBy(desc(rawFeeds.timestamp))
    .limit(pageSize)
    .offset(offset);
}

export async function getRawFeedById(id: string) {
  const result = await db
    .select()
    .from(rawFeeds)
    .where(eq(rawFeeds.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function getPendingFeeds(limit = 20) {
  return db
    .select()
    .from(rawFeeds)
    .where(eq(rawFeeds.status, "pending"))
    .orderBy(desc(rawFeeds.timestamp))
    .limit(limit);
}

export async function getRawFeedCount() {
  const result = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(rawFeeds);
  return result[0]?.count ?? 0;
}

export async function getPendingFeedCount() {
  const result = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(rawFeeds)
    .where(eq(rawFeeds.status, "pending"));
  return result[0]?.count ?? 0;
}

export async function updateRawFeed(
  id: string,
  data: Partial<typeof rawFeeds.$inferInsert>
) {
  return db.update(rawFeeds).set(data).where(eq(rawFeeds.id, id));
}

export async function promoteRawFeed(id: string) {
  return db
    .update(rawFeeds)
    .set({ status: "promoted", promotedAt: new Date() })
    .where(eq(rawFeeds.id, id));
}

export async function deleteRawFeed(id: string) {
  return db.delete(rawFeeds).where(eq(rawFeeds.id, id));
}

/* ---- Dark Web intercept feeds (for /dark-web-recon page) ---- */
export async function getDarkwebFeeds(limit = 30) {
  return db
    .select()
    .from(rawFeeds)
    .where(sql`${rawFeeds.sourceChannel} LIKE 'darkweb_%'`)
    .orderBy(desc(rawFeeds.createdAt))
    .limit(limit);
}
