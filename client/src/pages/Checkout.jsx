import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api.js";
import { useCart } from "../context/CartContext.jsx";
import "../css/checkout.css";

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_live_Te0OeStHnJXmrQ";

const loadRazorpay = () => new Promise((resolve, reject) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.onload = () => resolve(true);
  script.onerror = () => reject(new Error("Could not load Razorpay Checkout"));
  document.body.appendChild(script);
});

const Checkout = () => {
  const { items, subtotal, lineTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    customerEmail: "",
  });
  const [orderRole, setOrderRole] = useState("Delivery");
  const [paymentMethod, setPaymentMethod] = useState("Razorpay");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const total = subtotal;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const placeOrder = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;
    setError("");
    setPlacing(true);
    try {
      const { data } = await api.post("/orders", {
        ...form,
        orderType: orderRole,
        customerAddress: orderRole === "Delivery" ? form.customerAddress : "Shop counter pickup",
        items: items.map((i) => ({ productId: i.productId, name: i.name, grams: i.grams })),
        paymentMethod,
      });

      if (paymentMethod === "COD") {
        clearCart();
        navigate(`/order-success/${data._id}`);
      } else {
        await loadRazorpay();
        const razorpayKey = data.razorpayKeyId || RAZORPAY_KEY_ID || "rzp_live_Te0OeStHnJXmrQ";
        if (!razorpayKey || !data.razorpayOrder) {
          throw new Error("Razorpay is not configured. Please try again.");
        }
        const razorpay = new window.Razorpay({
          key: razorpayKey,
          amount: data.razorpayOrder.amount,
          currency: data.razorpayOrder.currency,
          name: "Chamundeshwari Home Sweets",
          description: `Order #${data.orderNumber}`,
          order_id: data.razorpayOrder.id,
          prefill: { name: form.customerName, contact: form.customerPhone, email: form.customerEmail },
          theme: { color: "#6B1E23" },
          handler: async (payment) => {
            try {
              await api.post("/orders/verify-razorpay", {
                orderId: data._id,
                razorpayOrderId: payment.razorpay_order_id,
                razorpayPaymentId: payment.razorpay_payment_id,
                razorpaySignature: payment.razorpay_signature,
              });
              clearCart();
              navigate(`/order-success/${data._id}`);
            } catch (verificationError) {
              setError(verificationError.response?.data?.message || "Payment verification failed.");
            }
          },
          modal: { ondismiss: () => setError("Payment was cancelled. You can try again.") },
        });
        razorpay.open();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  // Empty cart guard — moved into an effect so navigation is never called during render
  useEffect(() => {
    if (items.length === 0) navigate("/products");
  }, [items.length, navigate]);

  return (
    <section className="section">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Almost there</span>
          <h2>Checkout</h2>
        </div>

        <div className="checkout-grid">
          <form className="card checkout-form" onSubmit={placeOrder}>
            <h3>Customer Details</h3>
            <div className="form-group">
              <label>Full name</label>
              <input required name="customerName" value={form.customerName} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Phone number</label>
              <input required name="customerPhone" value={form.customerPhone} onChange={handleChange} pattern="[0-9]{10}" title="10 digit phone number" />
            </div>
            <div className="form-group">
              <label>{orderRole === "Delivery" ? "Delivery address" : "Pickup note"}</label>
              <textarea
                required={orderRole === "Delivery"}
                name="customerAddress"
                value={form.customerAddress}
                onChange={handleChange}
                rows="3"
                placeholder={orderRole === "Delivery" ? "House / street / area" : "Optional note for the shop"}
              />
            </div>
            <div className="form-group">
              <label>Email (optional)</label>
              <input type="email" name="customerEmail" value={form.customerEmail} onChange={handleChange} />
            </div>

            <h3>Payment Method</h3>
            <div className="checkout-role-options">
              <label className={`checkout-role-option ${orderRole === "Delivery" ? "is-selected" : ""}`}>
                <input type="radio" name="orderRole" checked={orderRole === "Delivery"} onChange={() => setOrderRole("Delivery")} />
                Online delivery
              </label>
              <label className={`checkout-role-option ${orderRole === "Counter" ? "is-selected" : ""}`}>
                <input type="radio" name="orderRole" checked={orderRole === "Counter"} onChange={() => setOrderRole("Counter")} />
                At shop / counter
              </label>
            </div>
            <div className="checkout-payment-options">
              <label className={`checkout-payment-option ${paymentMethod === "COD" ? "is-selected" : ""}`}>
                <input type="radio" name="paymentMethod" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} />
                {orderRole === "Delivery" ? "Cash on Delivery" : "Cash at Shop"}
              </label>
              <label className={`checkout-payment-option ${paymentMethod === "Razorpay" ? "is-selected" : ""}`}>
                <input type="radio" name="paymentMethod" checked={paymentMethod === "Razorpay"} onChange={() => setPaymentMethod("Razorpay")} />
                Pay securely with Razorpay
              </label>
            </div>

            {error && <p className="checkout-error">{error}</p>}

            <button className="btn btn-primary checkout-submit" disabled={placing}>
              {placing ? "Opening Payment..." : paymentMethod === "Razorpay" ? "Pay Securely" : "Place Order"}
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
