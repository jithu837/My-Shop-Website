import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "chs_cart";

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
          image: product.image,
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
