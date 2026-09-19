import React, { useEffect, useState } from "react";
import api from "../services/api.js";
import { useCart } from "../context/CartContext.jsx";
import ProductCard from "../components/ProductCard.jsx";
import "../css/products.css";
import "../css/counterorder.css";

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_live_Te0OeStHnJXmrQ";

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout"));
    document.body.appendChild(script);
  });

const CATEGORIES = ["All", "Sweets", "Hots", "Snacks", "Combo"];

// This is the page the shop's counter QR code points to.
// Customers browse menu, add items to cart, and pay via real Razorpay
// (UPI, Cards, NetBanking) or choose Cash at Counter.
const CounterOrder = () => {
  const { items, subtotal, lineTotal, clearCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [step, setStep] = useState("browse"); // 'browse' | 'pay' | 'done'
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Razorpay");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get("/products", { params: { category: category === "All" ? undefined : category } })
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }, [category]);

  const placeOrder = async () => {
    if (items.length === 0) return;
    setError("");
    setPlacing(true);

    try {
      const { data } = await api.post("/orders", {
        orderType: "Counter",
        customerName: customerName || "Walk-in Customer",
        customerPhone,
        items: items.map((i) => ({ productId: i.productId, name: i.name, grams: i.grams })),
        paymentMethod,
      });

      if (paymentMethod === "Cash") {
        setPlacedOrder(data);
        clearCart();
        setPaymentConfirmed(false);
        setStep("done");
        setPlacing(false);
        return;
      }

      // ── Real Razorpay Payment Gateway ──────────────────────────────────────
      await loadRazorpay();
      const razorpayKey = data.razorpayKeyId || RAZORPAY_KEY_ID || "rzp_live_Te0OeStHnJXmrQ";

      if (!razorpayKey || !data.razorpayOrder) {
        throw new Error("Razorpay gateway could not be initialized. Please try again.");
      }

      const razorpay = new window.Razorpay({
        key: razorpayKey,
        amount: data.razorpayOrder.amount,
        currency: data.razorpayOrder.currency,
        name: "Chamundeshwari Home Sweets",
        description: `Counter Order #${data.orderNumber}`,
        order_id: data.razorpayOrder.id,
        prefill: {
          name: customerName || "Walk-in Customer",
          contact: customerPhone || "",
        },
        theme: { color: "#6B1E23" },
        handler: async (payment) => {
          try {
            setPlacing(true);
            await api.post("/orders/verify-razorpay", {
              orderId: data._id,
              razorpayOrderId: payment.razorpay_order_id,
              razorpayPaymentId: payment.razorpay_payment_id,
              razorpaySignature: payment.razorpay_signature,
            });
            clearCart();
            setPlacedOrder({ ...data, paymentStatus: "Paid", razorpayPaymentId: payment.razorpay_payment_id });
            setPaymentConfirmed(true);
            setStep("done");
          } catch (verificationError) {
            setError(
              verificationError.response?.data?.message ||
                "Payment verification failed. Please check with the counter staff."
            );
          } finally {
            setPlacing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setError("Payment was cancelled. You can try again or pay Cash at Counter.");
            setPlacing(false);
          },
        },
      });

      razorpay.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not place order. Please try again.");
      setPlacing(false);
    }
  };

  const startOver = () => {
    setPlacedOrder(null);
    setPaymentConfirmed(false);
    setCustomerName("");
    setCustomerPhone("");
    setPaymentMethod("Razorpay");
    setError("");
    setStep("browse");
  };

  // ── Step: Done (Order Placed / Paid Successfully) ─────────────────────────
  if (step === "done" && placedOrder) {
    return (
      <section className="section counter-page">
        <div className="container counter-done">
          <div className="card counter-done-card" style={{ textAlign: "center", padding: "32px 24px" }}>
            {paymentConfirmed ? (
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "#22C55E",
                    color: "#FFFFFF",
                    fontSize: 32,
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px auto",
                    boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)",
                  }}
                >
                  ✓
                </div>
                <span className="eyebrow" style={{ color: "#16A34A", fontWeight: 700 }}>
                  Payment Received via Razorpay
                </span>
                <h2 style={{ marginTop: 6, marginBottom: 4 }}>Amount Paid Successfully</h2>
                <p style={{ color: "var(--color-ink-soft)", margin: "4px 0 0 0" }}>
                  Your order is confirmed and sent to the counter!
                </p>
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <span className="eyebrow">Counter Order Placed</span>
                <h2 style={{ marginTop: 6, marginBottom: 4 }}>Pay Cash at Counter</h2>
              </div>
            )}

            <div
              style={{
                background: "rgba(107,30,35,0.06)",
                border: "2px dashed rgba(107,30,35,0.3)",
                borderRadius: 12,
                padding: "16px 20px",
                margin: "16px auto",
                maxWidth: 280,
              }}
            >
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: 1, color: "var(--color-ink-soft)" }}>
                Your Order Token
              </div>
              <div style={{ fontSize: "2.8rem", fontWeight: 900, color: "var(--color-maroon-deep)", margin: "4px 0", lineHeight: 1.1 }}>
                #{placedOrder.tokenNumber || placedOrder.orderNumber}
              </div>
              {placedOrder.tokenNumber && (
                <div style={{ fontSize: "0.75rem", color: "var(--color-ink-soft)", marginBottom: "4px" }}>
                  Ref: {placedOrder.orderNumber}
                </div>
              )}
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-ink-deep)" }}>
                ₹{placedOrder.total}
              </div>
            </div>

            <p className="counter-done-hint" style={{ fontSize: "0.95rem", lineHeight: 1.5, margin: "16px 0 24px 0" }}>
              {paymentConfirmed ? (
                <>
                  Please show token <strong>#{placedOrder.tokenNumber || placedOrder.orderNumber}</strong> at the shop counter to collect your fresh sweets and hots.
                </>
              ) : (
                <>
                  Please pay <strong>₹{placedOrder.total}</strong> in cash at the counter and show token <strong>#{placedOrder.tokenNumber || placedOrder.orderNumber}</strong>.
                </>
              )}
            </p>

            <div className="counter-done-items" style={{ textAlign: "left", marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", marginBottom: 8, color: "var(--color-ink-soft)" }}>
                Order Summary
              </div>
              {placedOrder.items?.map((i, idx) => (
                <div className="counter-done-row" key={idx}>
                  <span>{i.name} ({i.grams}g)</span>
                  <span>₹{i.lineTotal}</span>
                </div>
              ))}
            </div>

            <button className="btn btn-primary" onClick={startOver} style={{ width: "100%", padding: "12px 20px" }}>
              Place Another Order
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── Step: Pay (Confirm details & choose Razorpay or Cash) ─────────────────
  if (step === "pay") {
    return (
      <section className="section counter-page">
        <div className="container counter-pay">
          <div className="card counter-pay-card">
            <span className="eyebrow">Your Counter Order</span>
            <h2>Review &amp; Pay</h2>

            <div className="checkout-summary-row-list">
              {items.map((i) => (
                <div className="checkout-summary-row" key={i.productId}>
                  <span>{i.name} ({i.grams}g)</span>
                  <span>₹{lineTotal(i)}</span>
                </div>
              ))}
            </div>
            <div className="cart-summary-total">
              <span>Total Amount</span>
              <span>₹{subtotal}</span>
            </div>

            <div className="form-group" style={{ marginTop: 20 }}>
              <label>Your Name (Optional)</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Ramesh"
              />
            </div>
            <div className="form-group">
              <label>Mobile Number (For order status / receipts)</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                pattern="[0-9]{10}"
                title="10 digit phone number"
                placeholder="10 digit mobile number"
              />
            </div>

            <h3 style={{ marginTop: 24, marginBottom: 12 }}>Choose Payment Method</h3>
            <div className="checkout-payment-options">
              <label className={`checkout-payment-option ${paymentMethod === "Razorpay" ? "is-selected" : ""}`}>
                <input
                  type="radio"
                  name="counterPayment"
                  checked={paymentMethod === "Razorpay"}
                  onChange={() => setPaymentMethod("Razorpay")}
                />
                <div>
                  <strong style={{ display: "block" }}>⚡ Online Payment (Razorpay Live)</strong>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-ink-soft)" }}>
                    UPI (Google Pay, PhonePe, Paytm, Navi), Cards &amp; NetBanking
                  </span>
                </div>
              </label>

              <label className={`checkout-payment-option ${paymentMethod === "Cash" ? "is-selected" : ""}`}>
                <input
                  type="radio"
                  name="counterPayment"
                  checked={paymentMethod === "Cash"}
                  onChange={() => setPaymentMethod("Cash")}
                />
                <div>
                  <strong style={{ display: "block" }}>💵 Cash at Counter</strong>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-ink-soft)" }}>
                    Pay with cash directly to the shopkeeper
                  </span>
                </div>
              </label>
            </div>

            {error && <p className="checkout-error" style={{ marginTop: 16 }}>{error}</p>}

            <button
              className="btn btn-primary checkout-submit"
              disabled={placing}
              onClick={placeOrder}
              style={{ marginTop: 20, width: "100%", padding: "14px", fontSize: "1rem" }}
            >
              {placing
                ? "Opening Razorpay..."
                : paymentMethod === "Razorpay"
                ? `Pay ₹${subtotal} with Razorpay`
                : `Place Order (Pay ₹${subtotal} Cash)`}
            </button>

            <button
              className="btn btn-outline counter-back"
              onClick={() => setStep("browse")}
              style={{ marginTop: 10, width: "100%" }}
            >
              ← Back to Menu
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── Step: Browse Menu ─────────────────────────────────────────────────────
  return (
    <section className="section counter-page">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Chamundeshwari Home Sweets</span>
          <h2>Order at the Counter</h2>
          <p className="counter-subtext">
            Add your favorites, review, and pay online instantly with Razorpay or by cash at the counter.
          </p>
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
