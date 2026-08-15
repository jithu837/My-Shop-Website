import React, { useEffect, useState } from "react";
import api from "../services/api.js";
import ProductCard from "../components/ProductCard.jsx";
import "../css/products.css";

const CATEGORIES = ["All", "Sweets", "Hots", "Snacks", "Combo"];

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    api
      .get("/products", { params: { category, search: search || undefined } })
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
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
          <div className="spinner" />
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
