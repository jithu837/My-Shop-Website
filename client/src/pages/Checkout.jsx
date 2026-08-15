import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import api from "../services/api.js";
import { useCart } from "../context/CartContext.jsx";
import "../css/checkout.css";

// Shop's UPI details - edit here if the UPI ID or payee name ever changes
const UPI_ID = "7816096147@naviaxis";
const UPI_PAYEE_NAME = "G JITHENDRA KUMAR";
const SHOP_NOTE = "Chamundeshwari Home Sweets";

const Checkout = () => {
  const { items, subtotal, lineTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    customerEmail: "",
  });
  const [couponCode, setCouponCode] = useState(location.state?.coupon || "");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null); // shown once order is created, before UPI confirm

  const discount = couponCode.toUpperCase() === "SWEET10" ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal - discount;

  const upiLink = placedOrder
    ? `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_PAYEE_NAME)}&am=${placedOrder.total}&cu=INR&tn=${encodeURIComponent(
        `${SHOP_NOTE} - ${placedOrder.orderNumber}`
      )}`
    : "";

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const placeOrder = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;
    setError("");
    setPlacing(true);
    try {
      const { data } = await api.post("/orders", {
        ...form,
        items: items.map((i) => ({ productId: i.productId, name: i.name, grams: i.grams })),
        paymentMethod,
        couponCode,
      });

      if (paymentMethod === "COD") {
        clearCart();
        navigate(`/order-success/${data._id}`);
      } else {
        setPlacedOrder(data); // show QR next, cart cleared after payment confirmation
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const confirmUpiPayment = async () => {
    await api.patch(`/orders/${placedOrder._id}/confirm-payment`);
    clearCart();
    navigate(`/order-success/${placedOrder._id}`);
  };

  if (items.length === 0 && !placedOrder) {
    navigate("/products");
    return null;
  }

  // Step 2: UPI QR screen, shown after the order is created
  if (placedOrder) {
    return (
      <section className="section">
        <div className="container checkout-upi">
          <div className="card checkout-upi-card">
            <span className="eyebrow">Scan &amp; Pay</span>
            <h2>₹{placedOrder.total}</h2>
            <p>Order #{placedOrder.orderNumber}</p>

            <div className="checkout-qr-wrap">
              <QRCodeSVG value={upiLink} size={220} bgColor="#FFFDF9" fgColor="#2B1B14" />
            </div>

            <p className="checkout-upi-hint">
              Scan with Google Pay, PhonePe, Paytm, Navi or any BHIM UPI app. The amount is filled in automatically.
            </p>
            <p className="checkout-upi-id">UPI ID: {UPI_ID}</p>

            <button className="btn btn-primary" onClick={confirmUpiPayment}>
              I've Paid — Confirm Payment
            </button>
            <p className="checkout-upi-note">
              Your order is saved. Once you confirm, the shop owner will verify and start preparing it.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Step 1: details + payment method
  return (
    <section className="section">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Almost there</span>
          <h2>Checkout</h2>
        </div>

        <div className="checkout-grid">
          <form className="card checkout-form" onSubmit={placeOrder}>
            <h3>Delivery Details</h3>
            <div className="form-group">
              <label>Full name</label>
              <input required name="customerName" value={form.customerName} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Phone number</label>
              <input required name="customerPhone" value={form.customerPhone} onChange={handleChange} pattern="[0-9]{10}" title="10 digit phone number" />
            </div>
            <div className="form-group">
              <label>Delivery address</label>
              <textarea required rows="3" name="customerAddress" value={form.customerAddress} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Email (optional)</label>
              <input type="email" name="customerEmail" value={form.customerEmail} onChange={handleChange} />
            </div>

            <h3>Payment Method</h3>
            <div className="checkout-payment-options">
              <label className={`checkout-payment-option ${paymentMethod === "COD" ? "is-selected" : ""}`}>
                <input type="radio" name="paymentMethod" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} />
                Cash on Delivery
              </label>
              <label className={`checkout-payment-option ${paymentMethod === "UPI" ? "is-selected" : ""}`}>
                <input type="radio" name="paymentMethod" checked={paymentMethod === "UPI"} onChange={() => setPaymentMethod("UPI")} />
                UPI (Scan &amp; Pay)
              </label>
            </div>

            {error && <p className="checkout-error">{error}</p>}

            <button className="btn btn-primary checkout-submit" disabled={placing}>
              {placing ? "Placing Order..." : paymentMethod === "UPI" ? "Continue to UPI Payment" : "Place Order"}
            </button>
          </form>

          <aside className="card checkout-summary">
            <h3>Order Summary</h3>
            {items.map((i) => (
              <div className="checkout-summary-row" key={i.productId}>
                <span>{i.name} ({i.grams}g)</span>
                <span>₹{lineTotal(i)}</span>
              </div>
            ))}
            <div className="form-group">
              <label>Coupon code</label>
              <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
            </div>
            {discount > 0 && (
              <div className="checkout-summary-row">
                <span>Discount</span>
                <span>−₹{discount}</span>
              </div>
            )}
            <div className="cart-summary-total">
              <span>Total</span>
              <span>₹{total}</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default Checkout;
