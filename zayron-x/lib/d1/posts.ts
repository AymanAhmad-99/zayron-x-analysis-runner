import { getCloudflareContext } from '@opennextjs/cloudflare';

export type Post = {
  id: string;
  title: string;
  summary: string;
  category: 'malware' | 'threat-actor' | 'analysis';
  source: string;
  published_at: string;
};

export async function getLatestPosts(limit = 6): Promise<Post[]> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as { DB?: { prepare: (sql: string) => any } }).DB;
  if (!db) return [];
  const result = await db
    .prepare(
      'SELECT id,title,summary,category,source,published_at FROM posts ORDER BY published_at DESC LIMIT ?1',
    )
    .bind(Math.min(Math.max(limit, 1), 12))
    .all();
  return (result.results ?? []) as Post[];
}
