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
  const [sort, setSort] = useState("newest");
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

  const visibleProducts = [...products].sort((first, second) => {
    if (sort === "price-low") return first.pricePerKg - second.pricePerKg;
    if (sort === "price-high") return second.pricePerKg - first.pricePerKg;
    if (sort === "popular") return (second.soldGrams || 0) - (first.soldGrams || 0);
    return new Date(second.createdAt || 0) - new Date(first.createdAt || 0);
  });

  const hasFilters = Boolean(search || category !== "All");

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
    setSort("newest");
  };

  return (
    <section className="section products-catalog">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Full Menu</span>
          <h2>All Products</h2>
        </div>

        <div className="products-toolbar">
          <div className="products-toolbar-topline">
            <label className="products-search-label">
              <span>Find your favourite</span>
              <input
                type="search"
                placeholder="Search sweets, hots..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="products-sort-label">
              <span>Sort by</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Fresh arrivals</option>
                <option value="popular">Best selling</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </label>
          </div>
          <div className="products-toolbar-bottomline">
            <div className="products-tabs" aria-label="Product categories">
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
            {hasFilters && (
              <button className="products-clear" onClick={clearFilters}>Clear filters</button>
            )}
          </div>
        </div>

        {!loading && !error && (
          <div className="products-results-meta">
            <span><strong>{visibleProducts.length}</strong> treats ready to order</span>
            <span className="products-results-note">Made fresh in small batches</span>
          </div>
        )}

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
        ) : visibleProducts.length === 0 ? (
          <p className="empty-state">No products found. Try a different search or category.</p>
        ) : (
          <div className="product-grid">
            {visibleProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Products;
