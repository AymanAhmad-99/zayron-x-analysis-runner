export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const threatId = searchParams.get("threatId");

    if (!threatId) {
      return NextResponse.json({ error: "Missing parameter: threatId" }, { status: 400 });
    }

    // Double security check at the API route layer
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Security clearance required. ZAYRON-X node access denied." },
        { status: 401 }
      );
    }

    // Query profiles table to double check subscriber status
    const { data: profile } = await supabase
      .from("profiles")
      .select("clearance_level")
      .eq("id", user.id)
      .single();

    if (!profile || profile.clearance_level !== "SUBSCRIBER") {
      return NextResponse.json(
        { error: "Clearance level synchronization failed. Subscriber tier required." },
        { status: 403 }
      );
    }

    // Return mock PDF buffer
    const mockPdfContent = `%PDF-1.4\n%...\n1 0 obj\n<< /Title (ZAYRON-X Executive SITREP) /Subject (Threat ID: ${threatId}) >>\nendobj\n%%EOF`;
    const buffer = Buffer.from(mockPdfContent, "utf-8");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ZAYRON-X-SITREP-${threatId}.pdf"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
