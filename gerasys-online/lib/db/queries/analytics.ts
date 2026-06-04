import { getDb, maskDatabaseUrl } from "../index";
import { subscribers, articles } from "../schema";
import { eq, sql } from "drizzle-orm";

function handleQueryError(error: unknown, functionName: string) {
  const maskedUrl = maskDatabaseUrl(process.env.DATABASE_URL || "");
  console.error(`DB Error in ${functionName} (DATABASE_URL: ${maskedUrl}):`, error);
}

/* ---- Subscriber count ---- */
export async function getSubscriberCount() {
  try {
    const result = await getDb()
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(subscribers)
      .where(eq(subscribers.isActive, true));
    return result[0]?.count ?? 0;
  } catch (error) {
    handleQueryError(error, "getSubscriberCount");
    return 0;
  }
}

/* ---- Total article views ---- */
export async function getTotalViews() {
  try {
    const result = await getDb()
      .select({ total: sql<number>`COALESCE(SUM(${articles.views}), 0)::int` })
      .from(articles);
    return result[0]?.total ?? 0;
  } catch (error) {
    handleQueryError(error, "getTotalViews");
    return 0;
  }
}

/* ---- Views today (estimated from recent articles) ---- */
export async function getViewsToday() {
  try {
    const result = await getDb()
      .select({ total: sql<number>`COALESCE(SUM(${articles.views}), 0)::int` })
      .from(articles)
      .where(
        sql`${articles.createdAt} >= CURRENT_DATE`
      );
    return result[0]?.total ?? 0;
  } catch (error) {
    handleQueryError(error, "getViewsToday");
    return 0;
  }
}
