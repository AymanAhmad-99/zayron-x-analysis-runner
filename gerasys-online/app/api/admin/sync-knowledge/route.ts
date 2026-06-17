import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const syncSecret = req.headers.get('X-Sync-Knowledge-Secret');
  const expectedSyncSecret = process.env.SYNC_KNOWLEDGE_SECRET;
  const hasValidSyncSecret =
    !!expectedSyncSecret && !!syncSecret && syncSecret === expectedSyncSecret;
  const token = authHeader?.replace('Bearer ', '').trim() ?? '';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  let hasValidUserToken = false;
  if (token) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (!authError && user) {
      // TODO: require explicit admin role for user-token path.
      hasValidUserToken = true;
    }
  }

  if (!hasValidUserToken && !hasValidSyncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, query, line_token, limit, id, text, values, metadata } = body;

    // Cloudflare Edge-RAG Correlation Lookup (Vectorize + KV)
    if (action === 'query') {
      let segments: string[] = [];
      const { data, error: selectError } = await supabase
        .from('knowledge_embeddings')
        .select('content')
        .textSearch('content', query, { type: 'websearch', config: 'english' })
        .limit(limit || 3);

      if (data && data.length > 0) {
        segments = data.map((d: any) => d.content);
      } else {
        // Fallback: fetch general segments if no results match
        const { data: fallbackData } = await supabase
          .from('knowledge_embeddings')
          .select('content')
          .limit(limit || 3);
        if (fallbackData) {
          segments = fallbackData.map((d: any) => d.content);
        }
      }
      return NextResponse.json({ segments });
    }
    if (action === 'insert') {
      const { error: insertError } = await supabase.from('knowledge_embeddings').upsert({
        id,
        content: text,
        embedding: values,
        metadata,
      });

      if (insertError) {
        console.error('[DATABASE ERROR] Failed to insert knowledge embedding:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[SECURITY ALERT] Payload processing failed', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
