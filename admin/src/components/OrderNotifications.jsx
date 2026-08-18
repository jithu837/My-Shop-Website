import React, { useEffect, useRef, useState, useCallback } from "react";
import printBill from "../utils/printBill.js";
import "../css/notification.css";

// Auto-dismiss after this many seconds.
const DISMISS_AFTER = 12;

// ── Voice announcement ─────────────────────────────────────────────────────
// Uses the browser's built-in Web Speech API — no API key, no cost.
const speak = (order) => {
  if (!window.speechSynthesis) return;
  // Cancel any ongoing speech so overlapping orders don't pile up.
  window.speechSynthesis.cancel();

  const name = order.customerName && order.customerName !== "Walk-in Customer"
    ? `Customer ${order.customerName}.`
    : "";
  const text = `New order received! ${name} Order number ${order.orderNumber}. Total amount rupees ${order.total}.`;

  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.92;
  utter.pitch = 1.05;
  utter.volume = 1.0;

  // Pick the best available English voice — prefer Indian English.
  const applyVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    const pick =
      voices.find((v) => v.lang === "en-IN") ||
      voices.find((v) => v.lang.startsWith("en") && /female|woman/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (pick) utter.voice = pick;
    window.speechSynthesis.speak(utter);
  };

  // getVoices() is async in some browsers — wait for voiceschanged if empty.
  if (window.speechSynthesis.getVoices().length > 0) {
    applyVoice();
  } else {
    window.speechSynthesis.onvoiceschanged = applyVoice;
  }
};

// ── Single notification card ───────────────────────────────────────────────
const NotifCard = ({ order, onDismiss }) => {
  const [dismissing, setDismissing] = useState(false);
  const timerRef = useRef(null);

  const dismiss = useCallback(() => {
    setDismissing(true);
    clearTimeout(timerRef.current);
    setTimeout(onDismiss, 280); // wait for slide-out animation
  }, [onDismiss]);

  // Auto-dismiss after DISMISS_AFTER seconds
  useEffect(() => {
    timerRef.current = setTimeout(dismiss, DISMISS_AFTER * 1000);
    return () => clearTimeout(timerRef.current);
  }, [dismiss]);

  const orderType = order.orderType === "Counter" ? "🔳 Counter" : "🚚 Delivery";
  const itemCount = order.items?.length ?? 0;

  return (
    <div
      className={`notif-card${dismissing ? " is-dismissing" : ""}`}
      style={{ "--notif-duration": `${DISMISS_AFTER}s` }}
    >
      {/* ── Progress drain bar (auto-dismiss countdown) ── */}
      <div className="notif-progress">
        <div className="notif-progress-bar" />
      </div>

      {/* ── Header ── */}
      <div className="notif-header">
        <div className="notif-badge">
          <span className="notif-badge-icon">🔔</span>
          New Order!
        </div>
        <button className="notif-close" onClick={dismiss} aria-label="Dismiss">✕</button>
      </div>

      {/* ── Customer name ── */}
      <div className="notif-body">
        <div className="notif-customer">
          {order.customerName || "Walk-in Customer"}
        </div>

        <div className="notif-meta">
          <span className="notif-chip">📋 {order.orderNumber}</span>
          <span className="notif-chip is-total">₹{order.total}</span>
          <span className="notif-chip">🛒 {itemCount} item{itemCount !== 1 ? "s" : ""}</span>
          <span className="notif-chip">{orderType}</span>
          <span className="notif-chip">💳 {order.paymentMethod}</span>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="notif-actions">
        <button
          className="notif-btn-print"
          onClick={() => { printBill(order); dismiss(); }}
        >
          🖨 Print Bill
        </button>
        <button className="notif-btn-dismiss" onClick={dismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
};

// ── Notification stack (rendered in AdminLayout) ───────────────────────────
const OrderNotifications = ({ orders, onDismiss }) => {
  if (orders.length === 0) return null;

  return (
    <div className="notif-stack" role="status" aria-live="polite">
      {orders.map((order) => (
        <NotifCard
          key={order._id}
          order={order}
          onDismiss={() => onDismiss(order._id)}
        />
      ))}
    </div>
  );
};

export { speak };
export default OrderNotifications;
