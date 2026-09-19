import React, { useState } from "react";
import { Link } from "react-router-dom";
import GramSelector from "./GramSelector.jsx";
import { useCart } from "../context/CartContext.jsx";
import { imageUrl } from "../services/api.js";
import "../css/productcard.css";

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const [grams, setGrams] = useState(product.minOrderGrams || 50);

  const effectivePrice = product.pricePerKg * (1 - (product.offerPercent || 0) / 100);
  const priceForGrams = Math.round((effectivePrice * grams) / 1000);
  const isAvailable = product.isAvailable !== false && product.stockGrams > 0 && product.inStock !== false && product.isActive !== false;
  const isOutOfStock = !isAvailable;

  const handleDisabledClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className={`product-card ${isOutOfStock ? "is-not-available" : ""}`}>
      {isOutOfStock ? (
        <>
          <span className="product-card-badge-unavailable">🚫 Not Available</span>
          <div className="product-card-overlay-unavailable" onClick={handleDisabledClick} title="This item is currently not available">
            <span>Not Available</span>
          </div>
        </>
      ) : (
        product.offerPercent > 0 && <span className="product-card-offer">{product.offerPercent}% OFF</span>
      )}

      <Link
        to={isOutOfStock ? "#" : `/products/${product._id}`}
        className="product-card-image-wrap"
        onClick={isOutOfStock ? handleDisabledClick : undefined}
        tabIndex={isOutOfStock ? -1 : 0}
        aria-disabled={isOutOfStock}
      >
        <img
          src={imageUrl(product)}
          alt={product.name}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/placeholder-sweet.svg";
          }}
        />
      </Link>

      <div className="product-card-body">
        <span className={`badge ${product.category === "Hots" ? "badge-terracotta" : "badge-leaf"}`}>
          {product.category}
        </span>
        <Link
          to={isOutOfStock ? "#" : `/products/${product._id}`}
          onClick={isOutOfStock ? handleDisabledClick : undefined}
          tabIndex={isOutOfStock ? -1 : 0}
          aria-disabled={isOutOfStock}
        >
          <h3>{product.name}</h3>
        </Link>

        <div className="product-card-price">
          ₹{priceForGrams}
          <span className="product-card-price-unit"> / {grams}g</span>
        </div>

        {isOutOfStock ? (
          <div style={{ marginTop: "4px" }}>
            <p className="product-card-oos">🚫 Out of stock</p>
            <button
              type="button"
              className="btn btn-outline btn-small product-card-add"
              disabled
              style={{ opacity: 0.5, cursor: "not-allowed", pointerEvents: "none", width: "100%", textAlign: "center" }}
            >
              Not Available
            </button>
          </div>
        ) : (
          <>
            <GramSelector
              grams={grams}
              onChange={setGrams}
              step={product.stepGrams || 50}
              min={product.minOrderGrams || 50}
              max={Math.min(product.maxOrderGrams || 1000, product.stockGrams)}
            />
            <button
              className="btn btn-primary btn-small product-card-add"
              onClick={() => addToCart(product, grams)}
            >
              Add to Cart
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
