import axios from "axios";

// In dev, VITE_API_URL is unset -> falls back to "/api", which the Vite
// proxy (vite.config.js) forwards to your local server on :5000.
// In production the client is on Vercel and the backend is on Render,
// so VITE_API_URL must be set to your live Render URL,
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
});

export const imageUrl = (filename) => {
  if (!filename) return "/placeholder-sweet.svg";
  if (filename.startsWith("data:image")) return filename;
  return API_BASE ? `${API_BASE}/uploads/${filename}` : `/uploads/${filename}`;
};

export default api;
