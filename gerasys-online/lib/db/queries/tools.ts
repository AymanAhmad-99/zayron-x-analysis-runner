import { getDb, maskDatabaseUrl } from "../index";
import { tools } from "../schema";
import { eq, desc, sql } from "drizzle-orm";
import type { Tool } from "../schema";

function handleQueryError(error: unknown, functionName: string) {
  const maskedUrl = maskDatabaseUrl(process.env.DATABASE_URL || "");
  console.error(`DB Error in ${functionName} (DATABASE_URL: ${maskedUrl}):`, error);
}

/* ---- All tools ---- */
export async function getTools() {
  try {
    return await getDb().select().from(tools).orderBy(desc(tools.stars));
  } catch (error) {
    handleQueryError(error, "getTools");
    return [] as Tool[];
  }
}

/* ---- Single tool by slug ---- */
export async function getToolBySlug(slug: string) {
  try {
    const result = await getDb()
      .select()
      .from(tools)
      .where(eq(tools.slug, slug))
      .limit(1);
    return result[0] ?? null;
  } catch (error) {
    handleQueryError(error, "getToolBySlug");
    return null;
  }
}

/* ---- Tools by category ---- */
export async function getToolsByCategory(category: string) {
  try {
    return await getDb()
      .select()
      .from(tools)
      .where(sql`LOWER(${tools.category}) = LOWER(${category})`)
      .orderBy(desc(tools.stars));
  } catch (error) {
    handleQueryError(error, "getToolsByCategory");
    return [] as Tool[];
  }
}

/* ---- All tool slugs for static generation ---- */
export async function getAllToolSlugs(limit = 500) {
  try {
    const result = await getDb()
      .select({ slug: tools.slug })
      .from(tools)
      .orderBy(desc(tools.stars))
      .limit(limit);
    return result.map((r) => r.slug);
  } catch (error) {
    handleQueryError(error, "getAllToolSlugs");
    return [] as string[];
  }
}

/* ---- Top tools by stars ---- */
export async function getTopTools(limit = 4) {
  try {
    return await getDb()
      .select()
      .from(tools)
      .orderBy(desc(tools.stars))
      .limit(limit);
  } catch (error) {
    handleQueryError(error, "getTopTools");
    return [] as Tool[];
  }
}
