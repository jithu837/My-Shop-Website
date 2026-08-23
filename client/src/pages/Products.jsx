import React, { useEffect, useState, useRef } from "react";
import api from "../services/api.js";
import ProductCard from "../components/ProductCard.jsx";
import { getCachedProducts, setCachedProducts } from "../services/productCache.js";
import "../css/products.css";

const CATEGORIES = ["All", "Sweets", "Hots", "Snacks", "Combo"];

const Products = () => {
  const cached = getCachedProducts();
  const [products, setProducts] = useState(cached?.data || []);
  const [loading, setLoading] = useState(!cached);
  const [isWaking, setIsWaking] = useState(false);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const isMounted = useRef(true);
  const isFetching = useRef(false); // guard: prevents parallel requests from flooding server

  // Can use cache only when filter is default (All + no search)
  const isDefaultFilter = category === "All" && !search;

  const load = (showSpinner = false) => {
    if (isFetching.current) return; // skip if a request is already in flight
    isFetching.current = true;
    if (showSpinner) setLoading(true);
    setError(false);
    api
      .get("/products", { params: { category, search: search || undefined } })
      .then((res) => {
        if (!isMounted.current) return;
        setProducts(res.data);
        // Only cache the full unfiltered list
        if (isDefaultFilter) setCachedProducts(res.data);
      })
      .catch(() => {
        if (isMounted.current) setError(true);
      })
      .finally(() => {
        isFetching.current = false;
        if (isMounted.current) setLoading(false);
      });
  };

  useEffect(() => {
    isMounted.current = true;
    const canUseCache = isDefaultFilter && cached;

    const wakeTimer = !canUseCache
      ? setTimeout(() => {
          if (isMounted.current && loading) setIsWaking(true);
        }, 3000)
      : null;

    // When filter changes and it's not default, show spinner immediately
    if (!isDefaultFilter) {
      setProducts([]);
    }

    const timer = setTimeout(() => load(!canUseCache), 250);
    // Background sync every 30s & on window focus — silent, no spinner
    // Guard: only fire if no request is already in flight (prevents server DDOS on slow/waking Render)
    const interval = setInterval(() => { if (!isFetching.current) load(false); }, 30000);
    const onFocus = () => { if (!isFetching.current) load(false); };
    window.addEventListener("focus", onFocus);

    return () => {
      isMounted.current = false;
      if (wakeTimer) clearTimeout(wakeTimer);
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, search]);

  return (
    <section className="section">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Full Menu</span>
          <h2>All Products</h2>
        </div>

        <div className="products-toolbar">
          <input
            type="search"
            placeholder="Search sweets, hots..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="products-tabs">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`products-tab ${category === c ? "is-active" : ""}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div className="spinner" />
            {isWaking && (
              <p style={{ marginTop: "16px", color: "#888", fontSize: "0.9rem" }}>
                ⏳ Server is starting up, please wait a moment…
              </p>
            )}
          </div>
        ) : error && products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ color: "#888", fontSize: "0.95rem", marginBottom: "16px" }}>
              ⚠️ Server is waking up. Please try again.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => load(true)}
            >
              🔄 Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <p className="empty-state">No products found. Try a different search or category.</p>
        ) : (
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Products;
