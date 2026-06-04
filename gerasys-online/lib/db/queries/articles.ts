import { getDb, maskDatabaseUrl } from "../index";
import { articles } from "../schema";
import { eq, desc, and, sql } from "drizzle-orm";
import type { Article } from "../schema";

const PAGE_SIZE = 12;

/* ---- Published articles only (public) ---- */
function publishedCondition() {
  return eq(articles.isPublished, true);
}

function handleQueryError(error: unknown, functionName: string) {
  const maskedUrl = maskDatabaseUrl(process.env.DATABASE_URL || "");
  console.error(`DB Error in ${functionName} (DATABASE_URL: ${maskedUrl}):`, error);
}

/* ---- Get single article by slug ---- */
export async function getArticleBySlug(slug: string) {
  try {
    const result = await getDb()
      .select()
      .from(articles)
      .where(and(eq(articles.slug, slug), publishedCondition()))
      .limit(1);
    return result[0] ?? null;
  } catch (error) {
    handleQueryError(error, "getArticleBySlug");
    return null;
  }
}

/* ---- Get single article by UUID ---- */
export async function getArticleById(id: string) {
  try {
    const result = await getDb()
      .select()
      .from(articles)
      .where(and(eq(articles.id, id), publishedCondition()))
      .limit(1);
    return result[0] ?? null;
  } catch (error) {
    handleQueryError(error, "getArticleById");
    return null;
  }
}

/* ---- Published articles paginated ---- */
export async function getArticles(page = 1, pageSize = PAGE_SIZE) {
  try {
    const offset = (page - 1) * pageSize;
    return await getDb()
      .select()
      .from(articles)
      .where(publishedCondition())
      .orderBy(desc(articles.publishedAt))
      .limit(pageSize)
      .offset(offset);
  } catch (error) {
    handleQueryError(error, "getArticles");
    return [] as Article[];
  }
}

/* ---- Featured articles ---- */
export async function getFeaturedArticles(limit = 6) {
  try {
    return await getDb()
      .select()
      .from(articles)
      .where(and(eq(articles.isFeatured, true), publishedCondition()))
      .orderBy(desc(articles.publishedAt))
      .limit(limit);
  } catch (error) {
    handleQueryError(error, "getFeaturedArticles");
    return [] as Article[];
  }
}

/* ---- Breaking articles ---- */
export async function getBreakingArticles(limit = 5) {
  try {
    return await getDb()
      .select()
      .from(articles)
      .where(and(eq(articles.isBreaking, true), publishedCondition()))
      .orderBy(desc(articles.publishedAt))
      .limit(limit);
  } catch (error) {
    handleQueryError(error, "getBreakingArticles");
    return [] as Article[];
  }
}

/* ---- Articles by category ---- */
export async function getArticlesByCategory(category: string, page = 1, pageSize = PAGE_SIZE) {
  try {
    const offset = (page - 1) * pageSize;
    return await getDb()
      .select()
      .from(articles)
      .where(
        and(
          sql`LOWER(${articles.category}) = LOWER(${category})`,
          publishedCondition()
        )
      )
      .orderBy(desc(articles.publishedAt))
      .limit(pageSize)
      .offset(offset);
  } catch (error) {
    handleQueryError(error, "getArticlesByCategory");
    return [] as Article[];
  }
}

/* ---- Trending articles (by views) ---- */
export async function getTrendingArticles(limit = 5) {
  try {
    return await getDb()
      .select()
      .from(articles)
      .where(publishedCondition())
      .orderBy(desc(articles.views))
      .limit(limit);
  } catch (error) {
    handleQueryError(error, "getTrendingArticles");
    return [] as Article[];
  }
}

/* ---- Related articles (same category, exclude current) ---- */
export async function getRelatedArticles(category: string, excludeSlug: string, limit = 3) {
  try {
    return await getDb()
      .select()
      .from(articles)
      .where(
        and(
          sql`${articles.category} = ${category}`,
          sql`${articles.slug} != ${excludeSlug}`,
          publishedCondition()
        )
      )
      .orderBy(desc(articles.publishedAt))
      .limit(limit);
  } catch (error) {
    handleQueryError(error, "getRelatedArticles");
    return [] as Article[];
  }
}

/* ---- All categories with counts ---- */
export async function getCategoriesWithCounts() {
  try {
    return await getDb()
      .select({
        category: articles.category,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(articles)
      .where(publishedCondition())
      .groupBy(articles.category)
      .orderBy(desc(sql`count`));
  } catch (error) {
    handleQueryError(error, "getCategoriesWithCounts");
    return [] as Array<{ category: string; count: number }>;
  }
}

/* ---- Search articles (full-text via SQL) ---- */
export async function searchArticles(query: string, limit = 20) {
  try {
    const searchQuery = query.trim().replace(/\s+/g, " & ");
    return await getDb()
      .select()
      .from(articles)
      .where(
        and(
          sql`to_tsvector('english', ${articles.title} || ' ' || COALESCE(${articles.excerpt}, '')) @@ to_tsquery('english', ${searchQuery})`,
          publishedCondition()
        )
      )
      .orderBy(desc(articles.publishedAt))
      .limit(limit);
  } catch (error) {
    handleQueryError(error, "searchArticles");
    return [] as Article[];
  }
}

/* ---- Increment view count ---- */
export async function incrementArticleViews(id: string) {
  try {
    return await getDb()
      .update(articles)
      .set({ views: sql`${articles.views} + 1` })
      .where(eq(articles.id, id));
  } catch (error) {
    handleQueryError(error, "incrementArticleViews");
    return null;
  }
}

/* ---- Article slugs for static generation ---- */
export async function getAllArticleSlugs(limit = 1000) {
  try {
    const result = await getDb()
      .select({ slug: articles.slug, category: articles.category })
      .from(articles)
      .where(publishedCondition())
      .orderBy(desc(articles.publishedAt))
      .limit(limit);
    return result.map((r) => ({ slug: r.slug, category: r.category }));
  } catch (error) {
    handleQueryError(error, "getAllArticleSlugs");
    return [] as Array<{ slug: string; category: string }>;
  }
}

/* ---- Total article count ---- */
export async function getArticleCount() {
  try {
    const result = await getDb()
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(articles)
      .where(publishedCondition());
    return result[0]?.count ?? 0;
  } catch (error) {
    handleQueryError(error, "getArticleCount");
    return 0;
  }
}

/* ---- Recent articles (for homepage) ---- */
export async function getRecentArticles(limit = 10) {
  try {
    return await getDb()
      .select()
      .from(articles)
      .where(publishedCondition())
      .orderBy(desc(articles.publishedAt))
      .limit(limit);
  } catch (error) {
    handleQueryError(error, "getRecentArticles");
    return [] as Article[];
  }
}

/* ---- Admin: all articles (including unpublished) ---- */
export async function getAllArticlesAdmin(page = 1, pageSize = 50) {
  try {
    const offset = (page - 1) * pageSize;
    return await getDb()
      .select()
      .from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(pageSize)
      .offset(offset);
  } catch (error) {
    handleQueryError(error, "getAllArticlesAdmin");
    return [] as Article[];
  }
}

/* ---- Admin: update article - explicit column whitelist ---- */
export async function updateArticle(id: string, data: Record<string, any>) {
  try {
    return await getDb()
      .update(articles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(articles.id, id));
  } catch (error) {
    handleQueryError(error, "updateArticle");
    throw error;
  }
}

/* ---- Admin: delete article ---- */
export async function deleteArticle(id: string) {
  try {
    return await getDb().delete(articles).where(eq(articles.id, id));
  } catch (error) {
    handleQueryError(error, "deleteArticle");
    throw error;
  }
}

/* ---- All unique tags with counts ---- */
export async function getAllTags() {
  try {
    const result = await getDb()
      .select({
        tag: sql<string>`unnest(${articles.tags})`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(articles)
      .where(publishedCondition())
      .groupBy(sql`unnest(${articles.tags})`)
      .orderBy(desc(sql`count`))
      .limit(50);
    return result.filter((r) => r.tag && r.tag.trim().length > 0);
  } catch (error) {
    handleQueryError(error, "getAllTags");
    return [] as Array<{ tag: string; count: number }>;
  }
}

/* ---- Admin: create article ---- */
export async function createArticle(data: Record<string, any>) {
  try {
    const result = await getDb().insert(articles).values(data as any).returning();
    return result[0];
  } catch (error) {
    handleQueryError(error, "createArticle");
    throw error;
  }
}
