import { getDb } from "../index";
import type { Tool } from "../schema";

function from() {
  return getDb().from("tools");
}

/* ---- All tools ---- */
export async function getTools() {
  const { data } = await from()
    .select("*")
    .order("stars", { ascending: false });
  return (data ?? []) as Tool[];
}

/* ---- Single tool by slug ---- */
export async function getToolBySlug(slug: string) {
  const { data, error } = await from()
    .select("*")
    .eq("slug", slug)
    .limit(1)
    .single();
  if (error) return null;
  return data as Tool | null;
}

/* ---- Tools by category ---- */
export async function getToolsByCategory(category: string) {
  const { data } = await from()
    .select("*")
    .ilike("category", category)
    .order("stars", { ascending: false });
  return (data ?? []) as Tool[];
}

/* ---- All tool slugs for static generation ---- */
export async function getAllToolSlugs(limit = 500) {
  const { data } = await from()
    .select("slug")
    .order("stars", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Array<{ slug: string }>).map((r) => r.slug);
}

/* ---- Top tools by stars ---- */
export async function getTopTools(limit = 4) {
  const { data } = await from()
    .select("*")
    .order("stars", { ascending: false })
    .limit(limit);
  return (data ?? []) as Tool[];
}
