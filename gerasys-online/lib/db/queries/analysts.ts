import { db } from "../index";
import { analysts } from "../schema";
import { desc } from "drizzle-orm";

export async function getAnalysts() {
  return db
    .select()
    .from(analysts)
    .orderBy(desc(analysts.articleCount));
}
