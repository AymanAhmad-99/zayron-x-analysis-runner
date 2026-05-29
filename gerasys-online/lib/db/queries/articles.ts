import { db } from "../index";
import { articles } from "../schema";
import { eq, desc, and, sql } from "drizzle-orm";

const PAGE_SIZE = 12;

/* ---- Published articles only (public) ---- */
function publishedCondition() {
  return eq(articles.isPublished, true);
}

/* ---- Get single article by slug ---- */
export async function getArticleBySlug(slug: string) {
  const result = await db
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), publishedCondition()))
    .limit(1);
  return result[0] ?? null;
}

/* ---- Get single article by UUID ---- */
export async function getArticleById(id: string) {
  const result = await db
    .select()
    .from(articles)
    .where(and(eq(articles.id, id), publishedCondition()))
    .limit(1);
  return result[0] ?? null;
}

/* ---- Published articles paginated ---- */
export async function getArticles(page = 1, pageSize = PAGE_SIZE) {
  const offset = (page - 1) * pageSize;
  return db
    .select()
    .from(articles)
    .where(publishedCondition())
    .orderBy(desc(articles.publishedAt))
    .limit(pageSize)
    .offset(offset);
}

/* ---- Featured articles ---- */
export async function getFeaturedArticles(limit = 6) {
  return db
    .select()
    .from(articles)
    .where(and(eq(articles.isFeatured, true), publishedCondition()))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}

/* ---- Breaking articles ---- */
export async function getBreakingArticles(limit = 5) {
  return db
    .select()
    .from(articles)
    .where(and(eq(articles.isBreaking, true), publishedCondition()))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}

/* ---- Articles by category ---- */
export async function getArticlesByCategory(category: string, page = 1, pageSize = PAGE_SIZE) {
  const offset = (page - 1) * pageSize;
  return db
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
}

/* ---- Trending articles (by views) ---- */
export async function getTrendingArticles(limit = 5) {
  return db
    .select()
    .from(articles)
    .where(publishedCondition())
    .orderBy(desc(articles.views))
    .limit(limit);
}

/* ---- Related articles (same category, exclude current) ---- */
export async function getRelatedArticles(category: string, excludeSlug: string, limit = 3) {
  return db
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
}

/* ---- All categories with counts ---- */
export async function getCategoriesWithCounts() {
  const result = await db
    .select({
      category: articles.category,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(articles)
    .where(publishedCondition())
    .groupBy(articles.category)
    .orderBy(desc(sql`count`));
  return result;
}

/* ---- Search articles (full-text via SQL) ---- */
export async function searchArticles(query: string, limit = 20) {
  const searchQuery = query.trim().replace(/\s+/g, " & ");
  return db
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
}

/* ---- Increment view count ---- */
export async function incrementArticleViews(id: string) {
  return db
    .update(articles)
    .set({ views: sql`${articles.views} + 1` })
    .where(eq(articles.id, id));
}

/* ---- Article slugs for static generation ---- */
export async function getAllArticleSlugs(limit = 1000) {
  const result = await db
    .select({ slug: articles.slug, category: articles.category })
    .from(articles)
    .where(publishedCondition())
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
  return result.map((r) => ({ slug: r.slug, category: r.category }));
}

/* ---- Total article count ---- */
export async function getArticleCount() {
  const result = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(articles)
    .where(publishedCondition());
  return result[0]?.count ?? 0;
}

/* ---- Recent articles (for homepage) ---- */
export async function getRecentArticles(limit = 10) {
  return db
    .select()
    .from(articles)
    .where(publishedCondition())
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}

/* ---- Admin: all articles (including unpublished) ---- */
export async function getAllArticlesAdmin(page = 1, pageSize = 50) {
  const offset = (page - 1) * pageSize;
  return db
    .select()
    .from(articles)
    .orderBy(desc(articles.publishedAt))
    .limit(pageSize)
    .offset(offset);
}

/* ---- Admin: update article ---- */
export async function updateArticle(id: string, data: Partial<typeof articles.$inferInsert>) {
  return db
    .update(articles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(articles.id, id));
}

/* ---- Admin: delete article ---- */
export async function deleteArticle(id: string) {
  return db.delete(articles).where(eq(articles.id, id));
}

/* ---- All unique tags with counts ---- */
export async function getAllTags() {
  const result = await db
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
}

/* ---- Admin: create article ---- */
export async function createArticle(data: typeof articles.$inferInsert) {
  const result = await db.insert(articles).values(data).returning();
  return result[0];
}
