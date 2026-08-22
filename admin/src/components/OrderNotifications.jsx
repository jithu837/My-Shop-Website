import React, { useEffect, useRef, useState, useCallback } from "react";
import printBill from "../utils/printBill.js";
import "../css/notification.css";
// ── Audio Unlocker ────────────────────────────────────────────────────────
// Browsers block audio unless the user has interacted with the document.
// We silently unlock audio on the first click/touch.
let globalAudioCtx = null;
let audioUnlocked = false;

const getAudioContext = () => {
  if (typeof window !== 'undefined' && !globalAudioCtx) {
    globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return globalAudioCtx;
};

const unlockAudio = () => {
  if (audioUnlocked) return;
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
    
    audioUnlocked = true;
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  } catch (e) {}
};

if (typeof window !== 'undefined') {
  document.addEventListener('click', unlockAudio);
  document.addEventListener('touchstart', unlockAudio);
}

// ── Voice & Sound announcement ─────────────────────────────────────────────
// Uses Web Audio API for a "ding" and Web Speech API for voice.
const playOscillator = (ctx) => {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2); // E5
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch(e) {}
};

const playDing = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => playOscillator(ctx)).catch(() => {});
    } else {
      playOscillator(ctx);
    }
  } catch (e) {
    // Ignore if audio context is blocked
  }
};

const speak = (order) => {
  playDing();
  
  if (!window.speechSynthesis) return;
  // Cancel any ongoing speech so overlapping orders don't pile up.
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }

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
const NotifCard = ({ order, queueLength, onDismiss, onConfirm }) => {
  const [dismissing, setDismissing] = useState(false);

  const dismiss = useCallback(() => {
    window.speechSynthesis?.cancel();
    setDismissing(true);
    setTimeout(onDismiss, 280); // wait for slide-out animation
  }, [onDismiss]);

  const confirm = useCallback(() => {
    window.speechSynthesis?.cancel();
    setDismissing(true);
    setTimeout(onConfirm, 280); 
  }, [onConfirm]);

  const orderType = order.orderType === "Counter" ? "🔳 Counter" : "🌐 Website Order";
  const itemCount = order.items?.length ?? 0;

  return (
    <div className={`notif-card${dismissing ? " is-dismissing" : ""}`}>
      <div className="notif-header">
        <div className="notif-badge">
          <span className="notif-badge-icon">🔔</span>
          {queueLength > 1 ? `Pending Orders: ${queueLength}` : "New Order!"}
        </div>
        <button className="notif-close" onClick={dismiss} aria-label="Dismiss">✕</button>
      </div>

      {/* ── Customer name & items ── */}
      <div className="notif-body">
        <div className="notif-customer">
          {order.customerName || "Walk-in Customer"}
        </div>

        <div className="notif-meta">
          <span className="notif-chip">📋 {order.orderNumber}</span>
          <span className="notif-chip is-total">₹{order.total}</span>
          <span className="notif-chip">{orderType}</span>
          <span className="notif-chip">💳 {order.paymentMethod}</span>
        </div>

        <div className="notif-items">
          {order.items?.map((item, idx) => (
            <div key={item._id || idx} className="notif-item-row">
              <span className="notif-item-name">{item.name}</span>
              <span className="notif-item-qty">
                 {item.grams >= 1000 ? `${item.grams / 1000}kg` : `${item.grams}g`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="notif-actions">
        <button
          className="notif-btn-print"
          onClick={() => { printBill(order); }}
        >
          🖨 Print Bill
        </button>
        <button className="notif-btn-confirm" onClick={confirm}>
          ✅ Confirm & Next
        </button>
      </div>
    </div>
  );
};

// ── Notification stack (rendered in AdminLayout) ───────────────────────────
const OrderNotifications = ({ orders, isOpen, onClose, onDismiss, onConfirm }) => {
  if (orders.length === 0) return null;
  
  const order = orders[0]; // Only show the first order in the queue

  return (
    <div className={`notif-drawer-overlay ${isOpen ? "is-open" : ""}`}>
      <div className="notif-drawer-backdrop" onClick={onClose} />
      <div className="notif-drawer" role="status" aria-live="polite">
        <div className="notif-drawer-header">
          <h3>Order Queue ({orders.length})</h3>
          <button className="notif-drawer-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="notif-drawer-body">
          <NotifCard
            key={order._id}
            order={order}
            queueLength={orders.length}
            onDismiss={() => {
               if (orders.length === 1) onClose();
               onDismiss(order._id);
            }}
            onConfirm={() => {
               if (orders.length === 1) onClose();
               onConfirm(order._id);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export { speak };
export default OrderNotifications;
