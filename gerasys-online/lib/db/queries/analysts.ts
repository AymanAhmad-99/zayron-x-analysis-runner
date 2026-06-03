import { getDb } from "../index";
import { analysts } from "../schema";
import { desc } from "drizzle-orm";

export async function getAnalysts() {
  return getDb()
    .select()
    .from(analysts)
    .orderBy(desc(analysts.articleCount));
}
