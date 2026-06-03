import { getDb } from "../index";
import { subscribers, articles } from "../schema";
import { eq, sql } from "drizzle-orm";

/* ---- Subscriber count ---- */
export async function getSubscriberCount() {
  const result = await getDb()
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(subscribers)
    .where(eq(subscribers.isActive, true));
  return result[0]?.count ?? 0;
}

/* ---- Total article views ---- */
export async function getTotalViews() {
  const result = await getDb()
    .select({ total: sql<number>`COALESCE(SUM(${articles.views}), 0)::int` })
    .from(articles);
  return result[0]?.total ?? 0;
}

/* ---- Views today (estimated from recent articles) ---- */
export async function getViewsToday() {
  const result = await getDb()
    .select({ total: sql<number>`COALESCE(SUM(${articles.views}), 0)::int` })
    .from(articles)
    .where(
      sql`${articles.createdAt} >= CURRENT_DATE`
    );
  return result[0]?.total ?? 0;
}
