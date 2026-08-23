/**
 * Product Cache — Stale-While-Revalidate pattern
 *
 * Products are cached in sessionStorage so that on repeat visits or page
 * navigations the UI can render instantly from cache while a background
 * fetch refreshes the data. This eliminates the long spinner wait caused
 * by Render free-tier cold starts (~30-50s).
 */

const CACHE_KEY = "products_cache";
const CACHE_TS_KEY = "products_cache_ts";
const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes — data is still usable even if slightly stale

/**
 * Read cached products from sessionStorage.
 * Returns { data: Product[], age: number } or null.
 */
export const getCachedProducts = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    const ts = Number(sessionStorage.getItem(CACHE_TS_KEY) || 0);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return { data, age: Date.now() - ts };
  } catch {
    return null;
  }
};

/**
 * Write products to sessionStorage cache.
 */
export const setCachedProducts = (products) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(products));
    sessionStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch {
    // Storage full — silently ignore
  }
};

/**
 * Returns true if the cache is fresh enough to skip showing a spinner.
 */
export const isCacheFresh = () => {
  const cached = getCachedProducts();
  return cached !== null && cached.age < CACHE_MAX_AGE;
};
