import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error('[SECURITY ALERT] Missing Authorization header on /api/admin/sync-knowledge');
    return NextResponse.json({ error: 'Forbidden', block: 'Fail-Closed' }, { status: 403 });
  }

  const token = authHeader.replace('Bearer ', '').trim();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Invariant 3: Fail-Closed Access Control via native supabase.auth.getUser()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  // For backend workers, we allow the service role key as a fallback
  if (authError || !user) {
    if (
      token !== process.env.SUPABASE_SERVICE_ROLE_KEY &&
      token !== process.env.SUPABASE_SERVICE_KEY
    ) {
      console.error(
        `[SECURITY ALERT] Unauthorized access attempt to /api/admin/sync-knowledge: ${authError?.message || 'Invalid User'}`,
      );
      return NextResponse.json({ error: 'Forbidden', block: 'Fail-Closed' }, { status: 403 });
    }
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
