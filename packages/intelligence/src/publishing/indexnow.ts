/**
 * IndexNow Protocol Push Engine
 * 
 * Enables immediate search engine indexing (Bing, Yandex, Seznam, Naver)
 * by actively pushing new and updated threat intelligence URLs to IndexNow endpoints
 * at publish time, rather than passively waiting for search crawlers.
 */

export const INDEXNOW_KEY = "9f3a1e2b4c5d6e7f8a9b0c1d2e3f4a5b";
export const INDEXNOW_HOST = "zayron-x.co";
export const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;

export interface IndexNowResult {
  success: boolean;
  status: number;
  submittedCount: number;
  message: string;
}

/**
 * Actively submits a list of URLs to the IndexNow protocol endpoint.
 * Accepts up to 10,000 URLs per batch.
 */
export async function submitUrlsToIndexNow(urls: string[]): Promise<IndexNowResult> {
  if (!urls || urls.length === 0) {
    return { success: true, status: 200, submittedCount: 0, message: "No URLs provided" };
  }

  // Ensure all URLs belong to the canonical host
  const validUrls = urls
    .map(u => u.trim())
    .filter(u => u.startsWith(`https://${INDEXNOW_HOST}`) || u.startsWith(`http://${INDEXNOW_HOST}`));

  if (validUrls.length === 0) {
    return { success: false, status: 400, submittedCount: 0, message: "No valid host URLs to submit" };
  }

  const payload = {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: validUrls,
  };

  const endpoints = [
    "https://api.indexnow.org/indexnow",
    "https://www.bing.com/indexnow",
  ];

  let lastStatus = 500;
  let lastText = "";

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      lastStatus = res.status;

      // 200: OK, 202: Accepted
      if (res.status === 200 || res.status === 202) {
        return {
          success: true,
          status: res.status,
          submittedCount: validUrls.length,
          message: `Successfully submitted ${validUrls.length} URLs to ${endpoint} (HTTP ${res.status})`,
        };
      }

      lastText = await res.text().catch(() => "");
    } catch (err: any) {
      lastText = err?.message || String(err);
    }
  }

  return {
    success: false,
    status: lastStatus,
    submittedCount: 0,
    message: `IndexNow submission pending/failed: HTTP ${lastStatus}: ${lastText}`,
  };
}
