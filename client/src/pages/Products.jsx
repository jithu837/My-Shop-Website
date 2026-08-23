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
  const [serverError, setServerError] = useState(false);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const isMounted = useRef(true);
  const isFetching = useRef(false); // prevents parallel requests flooding the server
  const retryTimer = useRef(null);  // auto-retry handle

  const isDefaultFilter = category === "All" && !search;

  const load = (showSpinner = false) => {
    if (isFetching.current) return; // skip if a request is already in flight
    isFetching.current = true;
    if (showSpinner) setLoading(true);
    setServerError(false);
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }

    api
      .get("/products", { params: { category, search: search || undefined } })
      .then((res) => {
        if (!isMounted.current) return;
        setProducts(res.data);
        if (isDefaultFilter) setCachedProducts(res.data); // only cache unfiltered list
      })
      .catch(() => {
        if (!isMounted.current) return;
        setServerError(true);
        // Auto-retry in 10 seconds — server may still be waking up
        retryTimer.current = setTimeout(() => {
          if (isMounted.current && !isFetching.current) load(false);
        }, 10000);
      })
      .finally(() => {
        isFetching.current = false;
        if (isMounted.current) setLoading(false);
      });
  };

  useEffect(() => {
    isMounted.current = true;
    isFetching.current = false; // reset on filter change so new category/search always fires
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }

    const canUseCache = isDefaultFilter && cached;
    if (!isDefaultFilter) setProducts([]);

    const timer = setTimeout(() => load(!canUseCache), 250);
    // Background sync every 30s & on focus — guarded so no request flood on slow server
    const interval = setInterval(() => { if (!isFetching.current) load(false); }, 30000);
    const onFocus = () => { if (!isFetching.current) load(false); };
    window.addEventListener("focus", onFocus);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
      clearInterval(interval);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, search]);

  const showSpinner = loading && products.length === 0;
  const showError   = serverError && products.length === 0 && !loading;

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

        {/* Subtle notice when showing stale cached data while server is recovering */}
        {serverError && products.length > 0 && (
          <p style={{ textAlign: "center", fontSize: "0.82rem", color: "#a0856b", marginBottom: "12px" }}>
            ⏳ Showing saved products · Reconnecting automatically…
          </p>
        )}

        {showSpinner ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div className="spinner" />
            <p style={{ marginTop: "16px", color: "#888", fontSize: "0.9rem" }}>
              ⏳ Loading products…
            </p>
          </div>
        ) : showError ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ color: "#888", fontSize: "0.95rem", marginBottom: "16px" }}>
              ⚠️ Server is starting up. Retrying automatically in 10s…
            </p>
            <button className="btn btn-primary" onClick={() => load(true)}>
              🔄 Retry Now
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
