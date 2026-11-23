export interface SmokeTelemetry {
  ok: boolean;
  duration_ms: number;
  error?: string;
}

/** Run an optional AI availability check without gating deterministic source ingestion. */
export async function checkAIAvailability(
  smokeTest: (() => Promise<unknown>) | undefined,
  report: (telemetry: SmokeTelemetry) => Promise<void>,
  now: () => number = Date.now,
): Promise<SmokeTelemetry> {
  const startedAt = now();
  try {
    if (!smokeTest) return { ok: true, duration_ms: 0 };
    await smokeTest();
    const telemetry = { ok: true, duration_ms: Math.max(0, now() - startedAt) };
    try { await report(telemetry); } catch { /* reporting cannot gate source ingestion */ }
    return telemetry;
  } catch (error) {
    const telemetry = {
      ok: false,
      duration_ms: Math.max(0, now() - startedAt),
      error: String(error).slice(0, 300),
    };
    try { await report(telemetry); } catch { /* reporting cannot gate source ingestion */ }
    return telemetry;
  }
}
