import { getDb } from "../index";
import type { ProgrammingLang } from "../schema";

/* ---- All programming languages ---- */
export async function getProgrammingLanguages() {
  const { data } = await getDb()
    .from("programming_langs")
    .select("*")
    .order("article_count", { ascending: false });
  return (data ?? []) as ProgrammingLang[];
}

/* ---- Single language by slug ---- */
export async function getProgrammingLangBySlug(slug: string) {
  const { data, error } = await getDb()
    .from("programming_langs")
    .select("*")
    .eq("slug", slug)
    .limit(1)
    .single();
  if (error) return null;
  return data as ProgrammingLang | null;
}

/* ---- All language slugs for static generation ---- */
export async function getAllProgrammingLangSlugs(limit = 100) {
  const { data } = await getDb()
    .from("programming_langs")
    .select("slug")
    .limit(limit);
  return ((data ?? []) as Array<{ slug: string }>).map((r) => r.slug);
}
