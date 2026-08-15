import React from "react";
import { useCart } from "../context/CartContext.jsx";
import "../css/cartpopup.css";

const CartPopup = () => {
  const { popup } = useCart();
  if (!popup) return null;

  return (
    <div className="cart-popup" role="status">
      <span className="cart-popup-icon">✓</span>
      <div>
        <strong>{popup.name}</strong>
        <div>{popup.grams}g added to cart</div>
      </div>
    </div>
  );
};

export default CartPopup;
