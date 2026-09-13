import axios from "axios";

// In dev, VITE_API_URL is unset -> falls back to "/api", which the Vite
// proxy (vite.config.js) forwards to your local server on :5000.
// In production the client is on Vercel and the backend is on Render,
// so VITE_API_URL must be set to your live Render URL,
// e.g. https://my-shop-website-xxxx.onrender.com
const API_BASE = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api` : "/api",
  timeout: 15000,
});

// ── Retry interceptor ─────────────────────────────────────────────────────────
// Render free tier: server sleeps after 15 min, first request gets 502/503.
// Retry up to 2 times with longer delays (5s, 10s) to give Render time to wake up.
// Short delays (1s, 2s) guaranteed another 502 since Render takes 30-50s to boot.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config;
    if (!config) return Promise.reject(err);

    const status = err.response?.status;
    const isRetryable =
      (!err.response && !import.meta.env.DEV) || // retry network errors only in production
      status === 502 ||
      status === 503 ||
      status === 504;

    config._retryCount = config._retryCount || 0;

    if (isRetryable && config._retryCount < 2) {
      config._retryCount++;
      const delay = config._retryCount * 5000; // 5s, 10s — give Render time to boot
      await new Promise((r) => setTimeout(r, delay));
      return api(config);
    }

    return Promise.reject(err);
  }
);

// imageUrl(product) — accepts a full product object OR just a filename string.
// • New products:    image = "1724000000-ladoo.jpg"  → /uploads/<filename>
// • Legacy products: image = "" + hasLegacyImage: true → /api/products/:id/image
// • Old base64 still in state: image starts with "data:" → use as-is
export const imageUrl = (productOrFilename, productId) => {
  // Called with a plain filename string (backwards-compat)
  if (typeof productOrFilename === "string") {
    const filename = productOrFilename;
    if (!filename) return "/placeholder-sweet.svg";
    if (filename.startsWith("data:image")) return filename;
    return API_BASE
      ? `${API_BASE}/uploads/${filename}`
      : `/uploads/${filename}`;
  }

  // Called with a product object
  const product = productOrFilename;
  const id = productId || product?._id;

  if (product?.hasLegacyImage && id) {
    return API_BASE
      ? `${API_BASE}/api/products/${id}/image`
      : `/api/products/${id}/image`;
  }
  if (!product?.image) return "/placeholder-sweet.svg";
  if (product.image.startsWith("data:image")) return product.image;
  return API_BASE
    ? `${API_BASE}/uploads/${product.image}`
    : `/uploads/${product.image}`;
};

export default api;
