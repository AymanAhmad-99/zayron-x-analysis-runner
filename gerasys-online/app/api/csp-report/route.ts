import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const report = await request.json();
    console.warn(
      JSON.stringify({
        event: "CSP_VIOLATION_REPORTED",
        report: report["csp-report"] || report,
      })
    );
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Failed to parse CSP report:", error?.message || error);
    return NextResponse.json({ error: "Invalid report format" }, { status: 400 });
  }
}
