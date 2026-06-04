import { getDb, maskDatabaseUrl } from "../index";
import { programmingLangs } from "../schema";
import { eq, desc } from "drizzle-orm";
import type { ProgrammingLang } from "../schema";

function handleQueryError(error: unknown, functionName: string) {
  const maskedUrl = maskDatabaseUrl(process.env.DATABASE_URL || "");
  console.error(`DB Error in ${functionName} (DATABASE_URL: ${maskedUrl}):`, error);
}

/* ---- All programming languages ---- */
export async function getProgrammingLanguages() {
  try {
    return await getDb()
      .select()
      .from(programmingLangs)
      .orderBy(desc(programmingLangs.articleCount));
  } catch (error) {
    handleQueryError(error, "getProgrammingLanguages");
    return [] as ProgrammingLang[];
  }
}

/* ---- Single language by slug ---- */
export async function getProgrammingLangBySlug(slug: string) {
  try {
    const result = await getDb()
      .select()
      .from(programmingLangs)
      .where(eq(programmingLangs.slug, slug))
      .limit(1);
    return result[0] ?? null;
  } catch (error) {
    handleQueryError(error, "getProgrammingLangBySlug");
    return null;
  }
}

/* ---- All language slugs for static generation ---- */
export async function getAllProgrammingLangSlugs(limit = 100) {
  try {
    const result = await getDb()
      .select({ slug: programmingLangs.slug })
      .from(programmingLangs)
      .limit(limit);
    return result.map((r) => r.slug);
  } catch (error) {
    handleQueryError(error, "getAllProgrammingLangSlugs");
    return [] as string[];
  }
}
