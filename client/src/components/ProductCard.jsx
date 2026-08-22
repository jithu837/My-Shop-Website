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
  const outOfStock = product.stockGrams <= 0;

  return (
    <div className="product-card">
      {product.offerPercent > 0 && <span className="product-card-offer">{product.offerPercent}% OFF</span>}
      <Link to={`/products/${product._id}`} className="product-card-image-wrap">
        <img src={imageUrl(product)} alt={product.name} loading="lazy" />
      </Link>

      <div className="product-card-body">
        <span className={`badge ${product.category === "Hots" ? "badge-terracotta" : "badge-leaf"}`}>
          {product.category}
        </span>
        <Link to={`/products/${product._id}`}>
          <h3>{product.name}</h3>
        </Link>

        <div className="product-card-price">
          ₹{priceForGrams}
          <span className="product-card-price-unit"> / {grams}g</span>
        </div>

        {outOfStock ? (
          <p className="product-card-oos">Out of stock</p>
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
