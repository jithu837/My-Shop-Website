import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import api from "../services/api.js";
import { useCart } from "../context/CartContext.jsx";
import ProductCard from "../components/ProductCard.jsx";
import "../css/products.css";
import "../css/counterorder.css";

// Shop's UPI details - keep in sync with Checkout.jsx if it ever changes
const UPI_ID = "7816096147@naviaxis";
const UPI_PAYEE_NAME = "G JITHENDRA KUMAR";
const SHOP_NOTE = "Chamundeshwari Home Sweets";

const CATEGORIES = ["All", "Sweets", "Hots", "Snacks", "Combo"];

// This is the page the shop's counter QR code points to.
// No delivery address, no name/phone requirement, no order tracking —
// just browse, add to cart, pay (Cash or UPI), and get an order number
// to show the counter staff.
const CounterOrder = () => {
  const { items, subtotal, lineTotal, clearCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [step, setStep] = useState("browse"); // browse -> pay -> upi-qr -> done
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get("/products", { params: { category: category === "All" ? undefined : category } })
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }, [category]);

  const upiLink = placedOrder
    ? `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_PAYEE_NAME)}&am=${placedOrder.total}&cu=INR&tn=${encodeURIComponent(
        `${SHOP_NOTE} - ${placedOrder.orderNumber}`
      )}`
    : "";

  const placeOrder = async () => {
    if (items.length === 0) return;
    setError("");
    setPlacing(true);
    try {
      const { data } = await api.post("/orders", {
        orderType: "Counter",
        customerName: customerName || "Walk-in Customer",
        items: items.map((i) => ({ productId: i.productId, name: i.name, grams: i.grams })),
        paymentMethod,
      });

      if (paymentMethod === "Cash") {
        setPlacedOrder(data);
        clearCart();
        setStep("done");
      } else {
        setPlacedOrder(data);
        setStep("upi-qr");
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
    setStep("done");
  };

  const startOver = () => {
    setPlacedOrder(null);
    setCustomerName("");
    setPaymentMethod("Cash");
    setError("");
    setStep("browse");
  };

  // ---- Step: Done (order confirmed / cash order placed) ----
  if (step === "done" && placedOrder) {
    return (
      <section className="section counter-page">
        <div className="container counter-done">
          <div className="card counter-done-card">
            <span className="eyebrow">Order Placed</span>
            <h2>#{placedOrder.orderNumber}</h2>
            <p className="counter-done-total">₹{placedOrder.total}</p>

            {placedOrder.paymentMethod === "Cash" ? (
              <p className="counter-done-hint">
                Please pay <strong>₹{placedOrder.total}</strong> in cash at the counter and show this order number.
              </p>
            ) : (
              <p className="counter-done-hint">
                Payment recorded. Please show this order number at the counter to collect your order.
              </p>
            )}

            <div className="counter-done-items">
              {placedOrder.items.map((i, idx) => (
                <div className="counter-done-row" key={idx}>
                  <span>{i.name} ({i.grams}g)</span>
                  <span>₹{i.lineTotal}</span>
                </div>
              ))}
            </div>

            <button className="btn btn-primary" onClick={startOver}>
              Place Another Order
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ---- Step: UPI QR ----
  if (step === "upi-qr" && placedOrder) {
    return (
      <section className="section counter-page">
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
              Show your order number at the counter once payment is confirmed.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // ---- Step: Pay (mini checkout, no address) ----
  if (step === "pay") {
    return (
      <section className="section counter-page">
        <div className="container counter-pay">
          <div className="card counter-pay-card">
            <span className="eyebrow">Your Order</span>
            <h2>Confirm &amp; Pay</h2>

            <div className="checkout-summary-row-list">
              {items.map((i) => (
                <div className="checkout-summary-row" key={i.productId}>
                  <span>{i.name} ({i.grams}g)</span>
                  <span>₹{lineTotal(i)}</span>
                </div>
              ))}
            </div>
            <div className="cart-summary-total">
              <span>Total</span>
              <span>₹{subtotal}</span>
            </div>

            <div className="form-group">
              <label>Your name (optional, helps us call out your order)</label>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Ramesh" />
            </div>

            <h3>Payment</h3>
            <div className="checkout-payment-options">
              <label className={`checkout-payment-option ${paymentMethod === "Cash" ? "is-selected" : ""}`}>
                <input type="radio" checked={paymentMethod === "Cash"} onChange={() => setPaymentMethod("Cash")} />
                💵 Cash at Counter
              </label>
              <label className={`checkout-payment-option ${paymentMethod === "UPI" ? "is-selected" : ""}`}>
                <input type="radio" checked={paymentMethod === "UPI"} onChange={() => setPaymentMethod("UPI")} />
                📱 UPI (Scan &amp; Pay)
              </label>
            </div>

            {error && <p className="checkout-error">{error}</p>}

            <button className="btn btn-primary checkout-submit" disabled={placing} onClick={placeOrder}>
              {placing ? "Placing Order..." : paymentMethod === "UPI" ? "Continue to UPI Payment" : "Place Order"}
            </button>
            <button className="btn btn-outline counter-back" onClick={() => setStep("browse")}>
              ← Back to Menu
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ---- Step: Browse (default) ----
  return (
    <section className="section counter-page">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Chamundeshwari Home Sweets</span>
          <h2>Order at the Counter</h2>
          <p className="counter-subtext">Add items, then pay by cash or UPI. No delivery needed — just collect at the counter.</p>
        </div>

        <div className="products-toolbar">
          <div className="products-tabs">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`products-tab ${category === c ? "is-active" : ""}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : products.length === 0 ? (
          <p className="empty-state">No products found.</p>
        ) : (
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="counter-cart-bar">
          <span>{items.length} item(s) · ₹{subtotal}</span>
          <button className="btn btn-primary" onClick={() => setStep("pay")}>
            Review &amp; Pay →
          </button>
        </div>
      )}
    </section>
  );
};

export default CounterOrder;
