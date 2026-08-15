import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import "../css/navbar.css";

const Navbar = () => {
  const { totalItems } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand" onClick={() => setOpen(false)}>
          <span className="navbar-brand-mark">CH</span>
          <span className="navbar-brand-text">
            Chamundeshwari
            <small>Home Sweets &amp; Hots</small>
          </span>
        </Link>

        <button
          className="navbar-toggle"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>

        <nav className={`navbar-links ${open ? "is-open" : ""}`}>
          <NavLink to="/" end onClick={() => setOpen(false)}>Home</NavLink>
          <NavLink to="/products" onClick={() => setOpen(false)}>Products</NavLink>
          <NavLink to="/about" onClick={() => setOpen(false)}>About</NavLink>
          <NavLink to="/cart" className="navbar-cart" onClick={() => setOpen(false)}>
            🛒 Cart
            {totalItems > 0 && <span className="navbar-cart-count">{totalItems}</span>}
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
