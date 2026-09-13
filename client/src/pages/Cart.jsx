import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import GramSelector from "../components/GramSelector.jsx";
import { imageUrl } from "../services/api.js";
import "../css/cart.css";

const Cart = () => {
  const { items, updateGrams, removeFromCart, lineTotal, subtotal } = useCart();
  const navigate = useNavigate();
  if (items.length === 0) {
    return (
      <section className="section">
        <div className="container empty-state">
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added any sweets or hots yet.</p>
          <Link to="/products" className="btn btn-primary">Browse Products</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Your Selection</span>
          <h2>Cart</h2>
        </div>

        <div className="cart-grid">
          <div className="cart-items">
            {items.map((item) => (
              <div className="cart-item" key={item.productId}>
                <img
                  src={imageUrl({
                    _id: item.productId,
                    image: item.image,
                    hasLegacyImage: item.hasLegacyImage || !item.image,
                  })}
                  alt={item.name}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = "/placeholder-sweet.svg";
                  }}
                />
                <div className="cart-item-info">
                  <h3>{item.name}</h3>
                  <div className="cart-item-price">₹{item.pricePerKg} / kg</div>
                  <GramSelector
                    grams={item.grams}
                    onChange={(g) => updateGrams(item.productId, g)}
                    step={item.stepGrams}
                    min={item.stepGrams}
                    max={item.maxOrderGrams}
                  />
                </div>
                <div className="cart-item-total">
                  ₹{lineTotal(item)}
                  <button className="cart-item-remove" onClick={() => removeFromCart(item.productId)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <aside className="cart-summary card">
            <h3>Order Summary</h3>
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>

            <div className="cart-summary-total">
              <span>To Pay</span>
              <span>₹{subtotal}</span>
            </div>
            <p className="cart-summary-note">Secure online payments are available at checkout.</p>

            <button
              className="btn btn-primary cart-checkout-btn"
              onClick={() => navigate("/checkout")}
            >
              Proceed to Checkout
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default Cart;
