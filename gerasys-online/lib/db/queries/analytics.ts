import { getDb } from "../index";

/* ---- Subscriber count ---- */
export async function getSubscriberCount() {
  const { count } = await getDb()
    .from("subscribers")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  return count ?? 0;
}

/* ---- Total article views ---- */
export async function getTotalViews() {
  const { data } = await getDb()
    .from("articles")
    .select("views");

  if (!data) return 0;

  return (data as Array<{ views: number | null }>).reduce(
    (sum, r) => sum + (r.views ?? 0),
    0
  );
}

/* ---- Views today (estimated from recent articles) ---- */
export async function getViewsToday() {
  // Filter for articles created today and sum their views
  const today = new Date().toISOString().split("T")[0];
  const { data } = await getDb()
    .from("articles")
    .select("views")
    .gte("created_at", today);

  if (!data) return 0;

  return (data as Array<{ views: number | null }>).reduce(
    (sum, r) => sum + (r.views ?? 0),
    0
  );
}
