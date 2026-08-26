import { sql, eq, desc, ilike, like } from 'drizzle-orm';
import { getDb } from '../client';
import { subscribers, articles } from '../schema';

export async function getSubscriberCount(env?: any) {
  const db = getDb(env);
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(subscribers)
    .where(eq(subscribers.isActive, true))
    .execute();
  return result[0]?.count || 0;
}

export async function getTotalViews(env?: any) {
  const db = getDb(env);
  const data = await db.select({ views: articles.views }).from(articles).execute();
  let total = 0;
  for (const row of data) {
    total += row.views || 0;
  }
  return total;
}

export async function getViewsToday(env?: any) {
  const db = getDb(env);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const data = await db.select({ views: articles.views })
    .from(articles)
    // createdAt string must be lexicographically compared
    .where(sql`${articles.createdAt} >= ${today.toISOString()}`)
    .execute();
  let total = 0;
  for (const row of data) {
    total += row.views || 0;
  }
  return total;
}
