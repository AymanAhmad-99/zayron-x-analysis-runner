import { getDb } from "../index";
import type { Analyst } from "../schema";

export async function getAnalysts() {
  const { data } = await getDb()
    .from("analysts")
    .select("*")
    .order("article_count", { ascending: false });
  return (data ?? []) as Analyst[];
}
