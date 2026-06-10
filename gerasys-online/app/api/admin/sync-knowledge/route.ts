import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.error("[SECURITY ALERT] Missing Authorization header on /api/admin/sync-knowledge");
    return NextResponse.json({ error: "Forbidden", block: "Fail-Closed" }, { status: 403 });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Invariant 3: Fail-Closed Access Control via native supabase.auth.getUser()
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  // For backend workers, we allow the service role key as a fallback
  if (authError || !user) {
    if (token !== process.env.SUPABASE_SERVICE_ROLE_KEY && token !== process.env.SUPABASE_SERVICE_KEY) {
      console.error(`[SECURITY ALERT] Unauthorized access attempt to /api/admin/sync-knowledge: ${authError?.message || 'Invalid User'}`);
      return NextResponse.json({ error: "Forbidden", block: "Fail-Closed" }, { status: 403 });
    }
  }

  try {
    const body = await req.json();
    const { action, query, line_token, limit, id, text, values, metadata } = body;

    // Cloudflare Edge-RAG Correlation Lookup (Vectorize + KV)
    if (action === "query") {
      // In production, this would query process.env.VECTORIZE_INDEX.query(values)
      // and retrieve the full text segments from process.env.KNOWLEDGE_KV
      // For this architecture refactor, we simulate the Top-3 structural segments:
      const segments = [
        `Extracted grounded book segment for sector: ${line_token} (Constraint 1)`,
        `Strategic guidance matched for query: ${query?.substring(0, 20)}... (Constraint 2)`,
        `Historical precedent matched in KV storage. (Constraint 3)`
      ];
      return NextResponse.json({ segments });
    } else if (action === "insert") {
      // In production: await process.env.VECTORIZE_INDEX.insert([{ id, values, metadata }])
      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[SECURITY ALERT] Payload processing failed", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
