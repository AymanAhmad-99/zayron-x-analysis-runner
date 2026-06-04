import { getDb, maskDatabaseUrl } from "../index";
import { analysts } from "../schema";
import { desc } from "drizzle-orm";
import type { Analyst } from "../schema";

export async function getAnalysts() {
  try {
    return await getDb()
      .select()
      .from(analysts)
      .orderBy(desc(analysts.articleCount));
  } catch (error) {
    console.error(`DB Error in getAnalysts (DATABASE_URL: ${maskDatabaseUrl(process.env.DATABASE_URL || "")}):`, error);
    return [] as Analyst[];
  }
}
