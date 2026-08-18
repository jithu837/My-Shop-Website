import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import CartPopup from "./components/CartPopup.jsx";

import Home from "./pages/Home.jsx";
import Products from "./pages/Products.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import OrderSuccess from "./pages/OrderSuccess.jsx";
import About from "./pages/About.jsx";
import CounterOrder from "./pages/CounterOrder.jsx";

function App() {
  const location = useLocation();
  // /order is the page the shop's counter QR code opens - kept minimal
  // (no navbar/footer clutter) so it feels like a quick ordering kiosk.
  const isCounterRoute = location.pathname.startsWith("/order");

  return (
    <>
      {!isCounterRoute && <Navbar />}
      {!isCounterRoute && <CartPopup />}

      <Routes>
        {/* Customer site */}
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success/:id" element={<OrderSuccess />} />
        <Route path="/about" element={<About />} />

        {/* In-shop QR ordering — what customers see when they scan the counter QR code */}
        <Route path="/order" element={<CounterOrder />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isCounterRoute && <Footer />}
    </>
  );
}

export default App;
