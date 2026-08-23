/**
 * Product Cache — Stale-While-Revalidate pattern
 *
 * Products are cached in localStorage (persists across tabs and URL visits)
 * so that on every visit the UI renders instantly from cache while a
 * background fetch silently refreshes the data. This eliminates the long
 * spinner caused by Render free-tier cold starts (~30-50s).
 *
 * Cache lifetime: 30 min — long enough to survive typical cold starts while
 * still showing fresh data for a regular shopping session.
 */

const CACHE_KEY = "products_cache_v2";
const CACHE_TS_KEY = "products_cache_ts_v2";
const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes

/**
 * Read cached products from localStorage.
 * Returns { data: Product[], age: number } or null.
 */
export const getCachedProducts = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const ts = Number(localStorage.getItem(CACHE_TS_KEY) || 0);
    if (!raw) return null;
    const age = Date.now() - ts;
    // Discard if older than 30 min
    if (age > CACHE_MAX_AGE) return null;
    const data = JSON.parse(raw);
    return { data, age };
  } catch {
    return null;
  }
};

/**
 * Write products to localStorage cache.
 */
export const setCachedProducts = (products) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(products));
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch {
    // Storage full — clear old keys and retry once
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TS_KEY);
      localStorage.setItem(CACHE_KEY, JSON.stringify(products));
      localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
    } catch {
      // Still full — silently ignore
    }
  }
};

/**
 * Returns true if the cache is fresh enough to skip showing a spinner.
 */
export const isCacheFresh = () => {
  const cached = getCachedProducts();
  return cached !== null && cached.age < CACHE_MAX_AGE;
};
