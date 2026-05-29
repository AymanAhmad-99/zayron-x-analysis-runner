import { db } from "../index";
import { programmingLangs } from "../schema";
import { eq, desc } from "drizzle-orm";

/* ---- All programming languages ---- */
export async function getProgrammingLanguages() {
  return db
    .select()
    .from(programmingLangs)
    .orderBy(desc(programmingLangs.articleCount));
}

/* ---- Single language by slug ---- */
export async function getProgrammingLangBySlug(slug: string) {
  const result = await db
    .select()
    .from(programmingLangs)
    .where(eq(programmingLangs.slug, slug))
    .limit(1);
  return result[0] ?? null;
}

/* ---- All language slugs for static generation ---- */
export async function getAllProgrammingLangSlugs(limit = 100) {
  const result = await db
    .select({ slug: programmingLangs.slug })
    .from(programmingLangs)
    .limit(limit);
  return result.map((r) => r.slug);
}
