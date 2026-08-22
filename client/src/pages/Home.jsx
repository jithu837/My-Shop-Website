import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api.js";
import ProductCard from "../components/ProductCard.jsx";
import "../css/home.css";

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWaking, setIsWaking] = useState(false); // true if server cold-starting

  const loadProducts = (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    api
      .get("/products")
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Show "waking up" hint if server takes > 3s (Render cold-start)
    const wakeTimer = setTimeout(() => {
      if (loading) setIsWaking(true);
    }, 3000);

    loadProducts(true);
    // Background sync every 30s & on focus — silent, no spinner/flash
    const interval = setInterval(() => loadProducts(false), 30000);
    const onFocus = () => loadProducts(false);
    window.addEventListener("focus", onFocus);

    return () => {
      clearTimeout(wakeTimer);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const offers = products.filter((p) => p.offerPercent > 0).slice(0, 4);
  const featured = products.slice(0, 8);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">Home-made · Fresh Daily · Weighed to the Gram</span>
            <h1>Chamundeshwari Home Sweets &amp; Hots</h1>
            <p>
              Traditional Andhra sweets and crunchy hots, made the way home kitchens make
              them - slow, honest, and full of ghee. Order exactly how much you need,
              from 50 grams to a full kilo.
            </p>
            <div className="hero-actions">
              <Link to="/products" className="btn btn-brass">Browse the Shop</Link>
              <Link to="/about" className="btn btn-outline">Our Story</Link>
            </div>
          </div>
          <div className="hero-plate">
            <div className="hero-plate-ring">
              <span>21</span>
              <small>fresh varieties</small>
            </div>
          </div>
        </div>
      </section>

      {offers.length > 0 && (
        <section className="offer-strip">
          <div className="container offer-strip-inner">
            <strong>🎉 Today's Offers:</strong>
            {offers.map((o) => (
              <span key={o._id} className="offer-strip-item">
                {o.name} — {o.offerPercent}% off
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">This Week</span>
            <h2>From our tray to your table</h2>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div className="spinner" />
              {isWaking && (
                <p style={{ marginTop: "16px", color: "#888", fontSize: "0.9rem" }}>
                  ⏳ Server is waking up, please wait a moment…
                </p>
              )}
            </div>
          ) : featured.length === 0 ? (
            <p className="empty-state">Products coming soon.</p>
          ) : (
            <div className="product-grid">
              {featured.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}

          <div className="section-cta">
            <Link to="/products" className="btn btn-primary">View All 21 Products</Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
