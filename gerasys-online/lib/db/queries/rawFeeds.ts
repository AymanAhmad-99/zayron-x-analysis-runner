import { getDb } from "../index";
import type { RawFeed } from "../schema";

function from() {
  return getDb().from("raw_feeds");
}

export async function getRawFeeds(page = 1, pageSize = 50) {
  const offset = (page - 1) * pageSize;
  const { data } = await from()
    .select("*")
    .order("timestamp", { ascending: false })
    .range(offset, offset + pageSize - 1);
  return (data ?? []) as RawFeed[];
}

export async function getRawFeedById(id: string) {
  const { data, error } = await from()
    .select("*")
    .eq("id", id)
    .limit(1)
    .single();
  if (error) return null;
  return data as RawFeed | null;
}

export async function getPendingFeeds(limit = 20) {
  const { data } = await from()
    .select("*")
    .eq("status", "pending")
    .order("timestamp", { ascending: false })
    .limit(limit);
  return (data ?? []) as RawFeed[];
}

export async function getRawFeedCount() {
  const { count } = await from()
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function getPendingFeedCount() {
  const { count } = await from()
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}

export async function updateRawFeed(
  id: string,
  data: Record<string, unknown>
) {
  return from().update(data).eq("id", id);
}

export async function promoteRawFeed(id: string) {
  return from()
    .update({ status: "promoted", promoted_at: new Date().toISOString() })
    .eq("id", id);
}

export async function deleteRawFeed(id: string) {
  return from().delete().eq("id", id);
}

/* ---- Dark Web intercept feeds ---- */
export async function getDarkwebFeeds(limit = 30) {
  const { data } = await from()
    .select("*")
    .like("source_channel", "darkweb_%")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as RawFeed[];
}
