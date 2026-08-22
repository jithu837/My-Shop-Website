import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "chs_cart";

// ── Helpers ───────────────────────────────────────────────────────────────────
// Strip base64 images before persisting — they can be several MB each and will
// blow past the 5 MB localStorage quota after adding just a few products.
// Only the filename (e.g. "ladoo.jpg") is saved; the full URL is rebuilt at
// render time via imageUrl() in the components that need it.
const toStorable = (items) =>
  items.map(({ image, ...rest }) => {
    // If it's already a short filename / path, keep it. If it's a base64
    // blob or an absolute https URL, drop it — it's too large to persist.
    const safe =
      image &&
      !image.startsWith("data:") &&
      !image.startsWith("http") &&
      !image.startsWith("/uploads")
        ? image
        : undefined;
    return safe ? { ...rest, image: safe } : rest;
  });

const saveCart = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStorable(items)));
  } catch {
    // QuotaExceededError — clear old data and try once more with stripped items
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStorable(items)));
    } catch {
      // Give up silently — cart still works in memory for this session
    }
  }
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [popup, setPopup] = useState(null); // { name, grams } shown briefly after add-to-cart

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addToCart = useCallback((product, grams) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product._id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product._id ? { ...i, grams: i.grams + grams } : i
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          image: product.image, // kept in React state for display; stripped if base64 before save
          pricePerKg: product.pricePerKg,
          offerPercent: product.offerPercent || 0,
          stepGrams: product.stepGrams || 50,
          maxOrderGrams: product.maxOrderGrams || 1000,
          grams,
        },
      ];
    });
    setPopup({ name: product.name, grams });
    setTimeout(() => setPopup(null), 2200);
  }, []);

  const updateGrams = useCallback((productId, grams) => {
    setItems((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, grams } : i))
        .filter((i) => i.grams > 0)
    );
  }, []);

  const removeFromCart = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const lineTotal = (item) => {
    const effectivePrice = item.pricePerKg * (1 - (item.offerPercent || 0) / 100);
    return Math.round((effectivePrice * item.grams) / 1000);
  };

  const subtotal = items.reduce((sum, i) => sum + lineTotal(i), 0);
  const totalItems = items.length;

  return (
    <CartContext.Provider
      value={{ items, addToCart, updateGrams, removeFromCart, clearCart, lineTotal, subtotal, totalItems, popup }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
