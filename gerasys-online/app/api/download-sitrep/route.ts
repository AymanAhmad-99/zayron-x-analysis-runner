import { createAdminClient, createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const threatId = searchParams.get('threatId');

    if (!threatId) {
      return NextResponse.json({ error: 'Missing parameter: threatId' }, { status: 400 });
    }

    // Double security check at the API route layer
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Security clearance required. ZAYRON-X node access denied.' },
        { status: 401 },
      );
    }

    // Query profiles table to double check subscriber status
    const { data: profile } = await supabase
      .from('profiles')
      .select('clearance_level')
      .eq('id', user.id)
      .single();

    if (!profile || profile.clearance_level !== 'SUBSCRIBER') {
      return NextResponse.json(
        { error: 'Clearance level synchronization failed. Subscriber tier required.' },
        { status: 403 },
      );
    }

    // Fetch live threat intelligence data using service role client
    const adminSupabase = await createAdminClient();
    const { data: threat, error: threatError } = await adminSupabase
      .from('threat_artifacts_secure')
      .select('*')
      .eq('id', threatId)
      .single();

    if (threatError || !threat) {
      return NextResponse.json(
        { error: 'Threat incident not found in database.' },
        { status: 404 },
      );
    }

    // Compile a dynamic PDF document on-the-fly containing active threat metrics
    const title = threat.title || 'Classified Threat Briefing';
    const severity = threat.severity || 'UNKNOWN';
    const cvss = threat.cvss_score || 'N/A';
    const fbr = threat.fbr_total ? `$${Number(threat.fbr_total).toLocaleString()}` : 'N/A';
    const sector = threat.sector || 'General';
    const iocs = threat.raw_iocs || 'None';
    const yara = threat.yara_rules || '// No YARA rules mapped.';

    // Simple, lightweight PDF document structure compatible with Cloudflare Workers (Edge)
    const pdfContent = [
      '%PDF-1.4',
      '1 0 obj',
      '<< /Type /Catalog /Pages 2 0 R >>',
      'endobj',
      '2 0 obj',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      'endobj',
      '3 0 obj',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      'endobj',
      '4 0 obj',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
      'endobj',
      '5 0 obj',
      '<< /Length 2000 >>',
      'stream',
      'BT',
      '/F1 16 Tf',
      '50 720 Td',
      '(ZAYRON-X EXECUTIVE THREAT SITUATION REPORT) Tj',
      '/F1 12 Tf',
      '0 -40 Td',
      `(Threat ID: ${threatId}) Tj`,
      '0 -25 Td',
      `(Title: ${title.replace(/[\(\)]/g, '')}) Tj`,
      '0 -20 Td',
      `(Severity: ${severity} | CVSS Score: ${cvss}) Tj`,
      '0 -20 Td',
      `(Financial Exposure: ${fbr} | Target Sector: ${sector}) Tj`,
      '0 -35 Td',
      '(INDICATORS OF COMPROMISE [IOCs]:) Tj',
      '0 -20 Td',
      `(${iocs.slice(0, 75).replace(/[\(\)]/g, '')}) Tj`,
      '0 -35 Td',
      '(YARA SIG RULES [PREMIUM INTEL DECRYPTED]:) Tj',
      '0 -20 Td',
      `(${yara.slice(0, 75).replace(/[\(\)]/g, '')}) Tj`,
      'ET',
      'endstream',
      'endobj',
      'xref',
      '0 6',
      '0000000000 65535 f',
      'trailer',
      '<< /Size 6 /Root 1 0 R >>',
      'startxref',
      '0',
      '%%EOF',
    ].join('\n');

    const buffer = Buffer.from(pdfContent, 'utf-8');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ZAYRON-X-SITREP-${threatId}.pdf"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
