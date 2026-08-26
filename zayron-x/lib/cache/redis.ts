type CacheBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

let cacheBinding: CacheBinding | null = null;

function resolveCacheBinding(env: any): CacheBinding | null {
  const binding =
    env?.ZAYRON_CACHE ??
    env?.NEXT_INC_CACHE_KV ??
    (globalThis as any).ZAYRON_CACHE ??
    (globalThis as any).__env__?.ZAYRON_CACHE ??
    (globalThis as any).env?.ZAYRON_CACHE ??
    null;

  return binding ?? null;
}

function getCacheBinding(env: any): CacheBinding | null {
  if (!cacheBinding) {
    cacheBinding = resolveCacheBinding(env);
  }

  return cacheBinding;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function normalizeCachedValue<T>(value: T): T {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return value;
  }
}

export async function getCached<T>(
  env: any,
  key: string,
  fetcher: () => Promise<T>,
  ttl = 300,
): Promise<T> {
  const binding = getCacheBinding(env);
  if (!binding) {
    return fetcher();
  }

  try {
    const cached = await withTimeout(binding.get(key), 1500, `KV GET ${key}`);
    if (cached !== null && cached !== undefined) {
      return normalizeCachedValue(cached as T);
    }

    const fresh = await fetcher();
    void withTimeout(
      binding.put(key, JSON.stringify(fresh), { expirationTtl: ttl }),
      1500,
      `KV PUT ${key}`,
    ).catch((error) => {
      console.error(`[KV FALLBACK] Error writing key "${key}" to cache:`, error);
    });

    return fresh;
  } catch (error) {
    console.error(`[KV FALLBACK] Error accessing key "${key}", falling back directly to source:`, error);
    return fetcher();
  }
}

export const getCachedOrFetch = getCached;
