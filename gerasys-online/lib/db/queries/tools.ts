import { getDb } from "../index";
import { tools } from "../schema";
import { eq, desc, sql } from "drizzle-orm";

/* ---- All tools ---- */
export async function getTools() {
  return getDb().select().from(tools).orderBy(desc(tools.stars));
}

/* ---- Single tool by slug ---- */
export async function getToolBySlug(slug: string) {
  const result = await getDb()
    .select()
    .from(tools)
    .where(eq(tools.slug, slug))
    .limit(1);
  return result[0] ?? null;
}

/* ---- Tools by category ---- */
export async function getToolsByCategory(category: string) {
  return getDb()
    .select()
    .from(tools)
    .where(sql`LOWER(${tools.category}) = LOWER(${category})`)
    .orderBy(desc(tools.stars));
}

/* ---- All tool slugs for static generation ---- */
export async function getAllToolSlugs(limit = 500) {
  const result = await getDb()
    .select({ slug: tools.slug })
    .from(tools)
    .orderBy(desc(tools.stars))
    .limit(limit);
  return result.map((r) => r.slug);
}

/* ---- Top tools by stars ---- */
export async function getTopTools(limit = 4) {
  return getDb()
    .select()
    .from(tools)
    .orderBy(desc(tools.stars))
    .limit(limit);
}
