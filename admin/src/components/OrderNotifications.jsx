import React, { useEffect, useRef, useState, useCallback } from "react";
import printBill from "../utils/printBill.js";
import "../css/notification.css";



// ── Voice & Sound announcement ─────────────────────────────────────────────
// Uses Web Audio API for a "ding" and Web Speech API for voice.
const playDing = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Create a pleasant double-chime (Ding-Dong)
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2); // E5
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Ignore if audio context is blocked
  }
};

const speak = (order) => {
  playDing();
  
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
    setTimeout(onDismiss, 280); // wait for slide-out animation
  }, [onDismiss]);

  const orderType = order.orderType === "Counter" ? "🔳 Counter" : "🌐 Website Order";
  const itemCount = order.items?.length ?? 0;

  return (
    <div className={`notif-card${dismissing ? " is-dismissing" : ""}`}>
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
