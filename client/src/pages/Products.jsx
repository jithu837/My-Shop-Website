import React, { useEffect, useState, useRef } from "react";
import api from "../services/api.js";
import ProductCard from "../components/ProductCard.jsx";
import "../css/products.css";

const CATEGORIES = ["All", "Sweets", "Hots", "Snacks", "Combo"];

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const isMounted = useRef(true);

  const loadProducts = () => {
    setLoading(true);
    setError(false);
    setProducts([]);

    api
      .get("/products", { params: { category, search: search || undefined } })
      .then((res) => {
        if (!isMounted.current) return;
        setProducts(res.data);
      })
      .catch(() => {
        if (!isMounted.current) return;
        setError(true);
      })
      .finally(() => {
        if (isMounted.current) setLoading(false);
      });
  };

  useEffect(() => {
    isMounted.current = true;
    
    // Add a slight debounce for search typing
    const timer = setTimeout(() => loadProducts(), 300);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
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
            <p style={{ marginTop: "16px", color: "#888", fontSize: "0.9rem" }}>
              Loading products...
            </p>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ color: "#888", fontSize: "0.95rem", marginBottom: "16px" }}>
              Could not load products at this time.
            </p>
            <button className="btn btn-primary" onClick={loadProducts}>
              Try Again
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
