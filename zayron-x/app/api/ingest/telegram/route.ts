import { hasAutomationSecret } from '@/lib/edge/auth';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (!hasAutomationSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (
    !payload ||
    typeof payload.id !== 'string' ||
    typeof payload.title !== 'string' ||
    typeof payload.summary !== 'string' ||
    typeof payload.source !== 'string' ||
    typeof payload.published_at !== 'string' ||
    !['malware', 'threat-actor', 'analysis'].includes(String(payload.category))
  ) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as { DB?: { prepare: (sql: string) => any } }).DB;
  if (!db) return NextResponse.json({ error: 'D1 binding unavailable' }, { status: 503 });
  await db
    .prepare(
      'INSERT INTO posts(id,title,summary,category,source,published_at) VALUES(?1,?2,?3,?4,?5,?6) ON CONFLICT(id) DO UPDATE SET title=excluded.title,summary=excluded.summary,category=excluded.category,source=excluded.source,published_at=excluded.published_at',
    )
    .bind(
      payload.id,
      payload.title,
      payload.summary,
      payload.category,
      payload.source,
      payload.published_at,
    )
    .run();
  return NextResponse.json({ accepted: true, id: payload.id, source: 'telegram' });
}
