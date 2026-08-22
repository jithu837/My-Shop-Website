import axios from "axios";

// In dev, VITE_API_URL is unset -> falls back to "/api", which the Vite
// proxy (vite.config.js) forwards to your local server on :5000.
// In production the admin panel is a separate deployment from the
// backend, so VITE_API_URL must be set to your live Render URL,
// e.g. https://my-shop-website-xxxx.onrender.com
const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_URL || "";
  if (!envUrl || envUrl.includes("elkf") || envUrl.includes("5pfw")) {
    return import.meta.env.DEV ? "" : "https://my-shop-website-g1pl.onrender.com";
  }
  return envUrl;
};

const API_BASE = getApiBase();

const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api` : "/api",
  timeout: 20000, // 20s — gives cold-starting Render server time to wake
});

// ── Retry interceptor ─────────────────────────────────────────────────────────
// Render free tier: server sleeps after 15 min, first request gets 502/503.
// Automatically retry up to 3 times with increasing delay (2s, 4s, 6s).
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config;
    if (!config) return Promise.reject(err);

    const status = err.response?.status;
    const isRetryable =
      !err.response || // network error / no response at all
      status === 502 ||
      status === 503 ||
      status === 504;

    config._retryCount = config._retryCount || 0;

    if (isRetryable && config._retryCount < 3) {
      config._retryCount++;
      const delay = config._retryCount * 2000; // 2s, 4s, 6s
      await new Promise((r) => setTimeout(r, delay));
      return api(config);
    }

    return Promise.reject(err);
  }
);

export const imageUrl = (filename) => {
  if (!filename) return "/placeholder-sweet.svg";
  if (filename.startsWith("data:image")) return filename;
  return API_BASE ? `${API_BASE}/uploads/${filename}` : `/uploads/${filename}`;
};

export default api;
