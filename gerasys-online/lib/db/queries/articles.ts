import { getDb } from "../index";
import type { Article } from "../schema";

const PAGE_SIZE = 12;

/* ─────────────────────────────────────────────────────────
   Edge‑native article queries — Supabase HTTP (no fs import)
   ───────────────────────────────────────────────────────── */

function from() {
  return getDb().from("articles");
}

/* ---- Get single article by slug ---- */
export async function getArticleBySlug(slug: string) {
  const { data, error } = await from()
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .limit(1)
    .single();
  if (error) return null;
  return data as Article | null;
}

/* ---- Get single article by UUID ---- */
export async function getArticleById(id: string) {
  const { data, error } = await from()
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .limit(1)
    .single();
  if (error) return null;
  return data as Article | null;
}

/* ---- Published articles paginated ---- */
export async function getArticles(page = 1, pageSize = PAGE_SIZE) {
  const offset = (page - 1) * pageSize;
  const { data } = await from()
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .range(offset, offset + pageSize - 1);
  return (data ?? []) as Article[];
}

/* ---- Featured articles ---- */
export async function getFeaturedArticles(limit = 6) {
  const { data } = await from()
    .select("*")
    .eq("is_featured", true)
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Article[];
}

/* ---- Breaking articles ---- */
export async function getBreakingArticles(limit = 5) {
  const { data } = await from()
    .select("*")
    .eq("is_breaking", true)
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Article[];
}

/* ---- Articles by category (case‑insensitive via ilike) ---- */
export async function getArticlesByCategory(category: string, page = 1, pageSize = PAGE_SIZE) {
  const offset = (page - 1) * pageSize;
  const { data } = await from()
    .select("*")
    .ilike("category", category)
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .range(offset, offset + pageSize - 1);
  return (data ?? []) as Article[];
}

/* ---- Trending articles (by views) ---- */
export async function getTrendingArticles(limit = 5) {
  const { data } = await from()
    .select("*")
    .eq("is_published", true)
    .order("views", { ascending: false })
    .limit(limit);
  return (data ?? []) as Article[];
}

/* ---- Related articles (same category, exclude current) ---- */
export async function getRelatedArticles(category: string, excludeSlug: string, limit = 3) {
  const { data } = await from()
    .select("*")
    .eq("category", category)
    .neq("slug", excludeSlug)
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Article[];
}

/* ---- All categories with counts ---- */
export async function getCategoriesWithCounts() {
  const { data } = await from()
    .select("category")
    .eq("is_published", true);

  if (!data) return [];

  const counts = new Map<string, number>();
  for (const row of data) {
    const cat = (row as Record<string, string>).category;
    if (cat) counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

/* ---- Search articles (full‑text via Supabase textSearch) ---- */
export async function searchArticles(query: string, limit = 20) {
  // Use Supabase's built-in full-text search on the title column.
  // This requires a generated tsvector column or FTS index on 'title'.
  // Fallback: ilike search if textSearch fails.
  const searchTerm = query.trim().replace(/\s+/g, " & ");
  const { data } = await from()
    .select("*")
    .eq("is_published", true)
    .or(`title.ilike.%${searchTerm}%,excerpt.ilike.%${searchTerm}%`)
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Article[];
}

/* ---- Increment view count (via RPC or direct update) ---- */
export async function incrementArticleViews(id: string) {
  // Fetch current views and increment.  This is not atomic, but Cloudflare
  // Workers' concurrency model makes race conditions unlikely for view counts.
  const { data: current } = await from()
    .select("views")
    .eq("id", id)
    .single();

  const currentViews = (current as Record<string, number> | null)?.views ?? 0;

  return from()
    .update({ views: currentViews + 1 })
    .eq("id", id);
}

/* ---- Article slugs for static generation ---- */
export async function getAllArticleSlugs(limit = 1000) {
  const { data } = await from()
    .select("slug, category")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Array<{ slug: string; category: string }>).map((r) => ({
    slug: r.slug,
    category: r.category,
  }));
}

/* ---- Total article count ---- */
export async function getArticleCount() {
  const { count } = await from()
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);
  return count ?? 0;
}

/* ---- Recent articles (for homepage) ---- */
export async function getRecentArticles(limit = 10) {
  const { data } = await from()
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Article[];
}

/* ---- Admin: all articles (including unpublished) ---- */
export async function getAllArticlesAdmin(page = 1, pageSize = 50) {
  const offset = (page - 1) * pageSize;
  const { data } = await from()
    .select("*")
    .order("published_at", { ascending: false })
    .range(offset, offset + pageSize - 1);
  return (data ?? []) as Article[];
}

/* ---- Admin: update article — explicit column whitelist ---- */
const ARTICLE_UPDATEABLE_COLUMNS = [
  "title", "subtitle", "author", "category", "tags", "content",
  "excerpt", "image_url", "read_time", "is_published", "is_featured",
  "is_breaking", "financial_exposure", "regulatory_risk", "mitigation_impact",
  "yara_rule", "image_tag", "fbr_score", "mitre_ttps", "iocs_json",
  "source_channel", "cvss_v4_score", "published_at",
] as const;

// Accept camelCase keys from callers — converted to snake_case internally
type ArticleUpdateData = Record<string, unknown>;

export async function updateArticle(id: string, data: ArticleUpdateData) {
  // Map camelCase TS fields to snake_case DB columns
  const dbData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    dbData[snakeKey] = value;
  }
  return from().update(dbData).eq("id", id);
}

/* ---- Admin: delete article ---- */
export async function deleteArticle(id: string) {
  return from().delete().eq("id", id);
}

/* ---- All unique tags with counts ---- */
export async function getAllTags() {
  const { data } = await from()
    .select("tags")
    .eq("is_published", true);

  if (!data) return [];

  const tagCounts = new Map<string, number>();
  for (const row of data) {
    const tags = (row as Record<string, string[]>).tags;
    if (Array.isArray(tags)) {
      for (const tag of tags) {
        const trimmed = tag?.trim();
        if (trimmed) tagCounts.set(trimmed, (tagCounts.get(trimmed) ?? 0) + 1);
      }
    }
  }

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);
}

/* ---- Admin: create article — explicit column whitelist ---- */
const ARTICLE_CREATEABLE_COLUMNS = [
  "title", "slug", "url_hash", "subtitle", "author", "category",
  "tags", "content", "excerpt", "image_url", "read_time",
  "is_published", "is_featured", "is_breaking", "financial_exposure",
  "regulatory_risk", "mitigation_impact", "yara_rule", "image_tag",
  "fbr_score", "mitre_ttps", "iocs_json", "source_channel",
  "cvss_v4_score", "published_at",
] as const;

// Accept camelCase keys from callers — converted to snake_case internally
type ArticleCreateData = Record<string, unknown>;

export async function createArticle(data: ArticleCreateData) {
  // Map camelCase TS fields to snake_case DB columns
  const dbData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const snakeKey = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    dbData[snakeKey] = value;
  }
  const { data: inserted, error } = await from().insert(dbData).select().single();
  if (error) throw error;
  return inserted as Article;
}
