/**
 * PHASE 9A (F4) — one bounded read with a single fast retry.
 *
 * A transient upstream 5xx or network failure must never be presented as "this
 * record does not exist". Only a real 404 is a `not_found` verdict; everything
 * else is an `error` the page turns into a 503 surface so neither Googlebot nor
 * the edge cache can persist a false 404.
 */

export type ReadState = "ok" | "not_found" | "error";

export interface ReadResult<T> {
  state: ReadState;
  data: T | null;
  status: number;
  error?: string;
}

const RETRY_DELAY_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransient(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

/**
 * Fetch JSON with ONE retry (150 ms) for network errors and 5xx/429 responses.
 * The caller decides what a 404 means; this helper never invents one.
 */
export async function readJsonResult<T>(
  url: string,
  init: RequestInit,
  fetchFn: typeof fetch = fetch,
): Promise<ReadResult<T>> {
  let lastStatus = 0;
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0) await sleep(RETRY_DELAY_MS);
    try {
      const response = await fetchFn(url, init);
      lastStatus = response.status;
      if (response.status === 404) {
        return { state: "not_found", data: null, status: 404, error: "NOT_FOUND" };
      }
      if (!response.ok) {
        if (isTransient(response.status) && attempt === 0) {
          lastError = `HTTP_${response.status}`;
          continue;
        }
        return { state: "error", data: null, status: response.status, error: `HTTP_${response.status}` };
      }
      const payload = (await response.json()) as T;
      return { state: "ok", data: payload, status: response.status };
    } catch (error) {
      lastError = String((error as Error)?.message ?? error).slice(0, 120);
      lastStatus = 0;
      if (attempt === 0) continue;
    }
  }
  return { state: "error", data: null, status: lastStatus, error: lastError || "NETWORK_ERROR" };
}

/** The canonical page verdict: only a confirmed upstream 404 becomes `notFound()`. */
export function shouldNotFound(result: { state: string }): boolean {
  return result.state === "not_found";
}

/** A transport failure must surface as a transient error, never a cached 404. */
export function shouldThrow(result: { state: string }): boolean {
  return result.state === "error";
}

export function notFoundError(message: string): Error {
  const error = new Error(message);
  (error as Error & { digest?: string }).digest = "NOT_FOUND";
  return error;
}
