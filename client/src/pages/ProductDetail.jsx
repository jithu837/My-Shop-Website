import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { imageUrl } from "../services/api.js";
import GramSelector from "../components/GramSelector.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { useCart } from "../context/CartContext.jsx";
import "../css/productdetail.css";

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [grams, setGrams] = useState(50);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(5);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/products/${id}`),
      api.get(`/products/${id}/related`),
    ]).then(([p, r]) => {
      setProduct(p.data);
      setGrams(p.data.minOrderGrams || 50);
      setRelated(r.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const submitFeedback = async (e) => {
    e.preventDefault();
    await api.post("/feedback", {
      customerName: feedbackName || "Anonymous",
      product: id,
      rating,
      message: feedbackMsg,
    });
    setFeedbackSent(true);
    setFeedbackMsg("");
  };

  if (loading) return <div className="spinner" />;
  if (!product) return <p className="empty-state">Product not found.</p>;

  const effectivePrice = product.pricePerKg * (1 - (product.offerPercent || 0) / 100);
  const priceForGrams = Math.round((effectivePrice * grams) / 1000);
  const outOfStock = product.stockGrams <= 0;

  return (
    <section className="section">
      <div className="container">
        <div className="pd-grid">
          <div className="pd-image">
            <img src={imageUrl(product.image)} alt={product.name} />
          </div>

          <div className="pd-info">
            <span className={`badge ${product.category === "Hots" ? "badge-terracotta" : "badge-leaf"}`}>
              {product.category}
            </span>
            <h1>{product.name}</h1>
            {product.ratingCount > 0 && (
              <div className="pd-rating">★ {product.ratingAvg} <span>({product.ratingCount} reviews)</span></div>
            )}
            <p className="pd-desc">{product.description}</p>

            <div className="pd-price">
              ₹{priceForGrams} <span>for {grams >= 1000 ? `${grams / 1000}kg` : `${grams}g`}</span>
              {product.offerPercent > 0 && <span className="badge badge-terracotta pd-offer-badge">{product.offerPercent}% OFF</span>}
            </div>
            <div className="pd-perkg">₹{product.pricePerKg} / kg base price</div>

            {outOfStock ? (
              <p className="product-card-oos">Currently out of stock</p>
            ) : (
              <>
                <GramSelector
                  grams={grams}
                  onChange={setGrams}
                  step={product.stepGrams || 50}
                  min={product.minOrderGrams || 50}
                  max={Math.min(product.maxOrderGrams || 1000, product.stockGrams)}
                />
                <div className="pd-actions">
                  <button className="btn btn-primary" onClick={() => addToCart(product, grams)}>
                    Add to Cart
                  </button>
                  <Link to="/cart" className="btn btn-outline">Go to Cart</Link>
                </div>
              </>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <div className="pd-related">
            <h2>You may also like</h2>
            <div className="product-grid">
              {related.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        )}

        <div className="pd-feedback">
          <h2>Share your feedback</h2>
          {feedbackSent ? (
            <p className="pd-feedback-thanks">Thank you! Your feedback has been recorded.</p>
          ) : (
            <form onSubmit={submitFeedback} className="pd-feedback-form">
              <div className="form-group">
                <label>Your name</label>
                <input value={feedbackName} onChange={(e) => setFeedbackName(e.target.value)} placeholder="Optional" />
              </div>
              <div className="form-group">
                <label>Rating</label>
                <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                  {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} star{r > 1 ? "s" : ""}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea rows="3" value={feedbackMsg} onChange={(e) => setFeedbackMsg(e.target.value)} placeholder="How was it?" />
              </div>
              <button type="submit" className="btn btn-brass">Submit Feedback</button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductDetail;
