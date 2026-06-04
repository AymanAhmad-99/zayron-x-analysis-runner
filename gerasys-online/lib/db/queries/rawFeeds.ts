import { getDb, maskDatabaseUrl } from "../index";
import { rawFeeds } from "../schema";
import { eq, desc, sql } from "drizzle-orm";
import type { RawFeed } from "../schema";

function handleQueryError(error: unknown, functionName: string) {
  const maskedUrl = maskDatabaseUrl(process.env.DATABASE_URL || "");
  console.error(`DB Error in ${functionName} (DATABASE_URL: ${maskedUrl}):`, error);
}

export async function getRawFeeds(page = 1, pageSize = 50) {
  try {
    const offset = (page - 1) * pageSize;
    return await getDb()
      .select()
      .from(rawFeeds)
      .orderBy(desc(rawFeeds.timestamp))
      .limit(pageSize)
      .offset(offset);
  } catch (error) {
    handleQueryError(error, "getRawFeeds");
    return [] as RawFeed[];
  }
}

export async function getRawFeedById(id: string) {
  try {
    const result = await getDb()
      .select()
      .from(rawFeeds)
      .where(eq(rawFeeds.id, id))
      .limit(1);
    return result[0] ?? null;
  } catch (error) {
    handleQueryError(error, "getRawFeedById");
    return null;
  }
}

export async function getPendingFeeds(limit = 20) {
  try {
    return await getDb()
      .select()
      .from(rawFeeds)
      .where(eq(rawFeeds.status, "pending"))
      .orderBy(desc(rawFeeds.timestamp))
      .limit(limit);
  } catch (error) {
    handleQueryError(error, "getPendingFeeds");
    return [] as RawFeed[];
  }
}

export async function getRawFeedCount() {
  try {
    const result = await getDb()
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(rawFeeds);
    return result[0]?.count ?? 0;
  } catch (error) {
    handleQueryError(error, "getRawFeedCount");
    return 0;
  }
}

export async function getPendingFeedCount() {
  try {
    const result = await getDb()
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(rawFeeds)
      .where(eq(rawFeeds.status, "pending"));
    return result[0]?.count ?? 0;
  } catch (error) {
    handleQueryError(error, "getPendingFeedCount");
    return 0;
  }
}

export async function updateRawFeed(
  id: string,
  data: Partial<typeof rawFeeds.$inferInsert>
) {
  try {
    return await getDb().update(rawFeeds).set(data).where(eq(rawFeeds.id, id));
  } catch (error) {
    handleQueryError(error, "updateRawFeed");
    throw error;
  }
}

export async function promoteRawFeed(id: string) {
  try {
    return await getDb()
      .update(rawFeeds)
      .set({ status: "promoted", promotedAt: new Date() })
      .where(eq(rawFeeds.id, id));
  } catch (error) {
    handleQueryError(error, "promoteRawFeed");
    throw error;
  }
}

export async function deleteRawFeed(id: string) {
  try {
    return await getDb().delete(rawFeeds).where(eq(rawFeeds.id, id));
  } catch (error) {
    handleQueryError(error, "deleteRawFeed");
    throw error;
  }
}

/* ---- Dark Web intercept feeds (for /dark-web-recon page) ---- */
export async function getDarkwebFeeds(limit = 30) {
  try {
    return await getDb()
      .select()
      .from(rawFeeds)
      .where(sql`${rawFeeds.sourceChannel} LIKE 'darkweb_%'`)
      .orderBy(desc(rawFeeds.createdAt))
      .limit(limit);
  } catch (error) {
    handleQueryError(error, "getDarkwebFeeds");
    return [] as RawFeed[];
  }
}
