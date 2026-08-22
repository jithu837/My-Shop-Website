import React from "react";
import { Link } from "react-router-dom";
import "../css/footer.css";

const Footer = () => (
  <footer className="footer">
    <div className="container footer-inner">
      <div>
        <h3>Chamundeshwari Home Sweets &amp; Hots</h3>
        <p>Homemade sweets and savory snacks, weighed fresh and packed with care.</p>
      </div>
      <div>
        <h4>Explore</h4>
        <ul>
          <li><Link to="/products">All Products</Link></li>
          <li><Link to="/about">About the Shop</Link></li>
        </ul>
      </div>
      <div>
        <h4>Order support</h4>
        <p>Cash in Store and UPI accepted.<br />Fresh batches prepared daily.</p>
      </div>
    </div>
    <div className="footer-bottom container">
      &copy; {new Date().getFullYear()} Chamundeshwari Home Sweets &amp; Hots. All rights reserved.
    </div>
  </footer>
);

export default Footer;
