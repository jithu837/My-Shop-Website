import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import "./css/global.css";

// ── One-time cleanup: remove base64 images from any previously saved cart ──
// Older versions stored full base64 images, filling up the 5 MB localStorage
// quota. Strip them out now so existing users stop seeing QuotaExceededError.
try {
  const raw = localStorage.getItem("chs_cart");
  if (raw) {
    const items = JSON.parse(raw);
    const cleaned = items.map(({ image, ...rest }) => {
      const safe = image && !image.startsWith("data:") && !image.startsWith("http") ? image : undefined;
      return safe ? { ...rest, image: safe } : rest;
    });
    localStorage.setItem("chs_cart", JSON.stringify(cleaned));
  }
} catch {
  // If anything fails just wipe the cart — better than a broken app
  try { localStorage.removeItem("chs_cart"); } catch { /* ignore */ }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <CartProvider>
        <App />
      </CartProvider>
    </BrowserRouter>
  </React.StrictMode>
);
