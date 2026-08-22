import React, { useState, useCallback, useEffect } from "react";
import printBill from "../utils/printBill.js";
import "../css/notification.css";

// ── Audio setup ───────────────────────────────────────────────────────────────
// Create Audio object once at module level.
const dingAudio = typeof window !== "undefined" ? new Audio("/ding.wav") : null;
if (dingAudio) {
  dingAudio.preload = "auto";
  dingAudio.volume = 1.0;
}

// Global flag: has the user unlocked audio via interaction?
let audioUnlocked = false;

/**
 * Call this once from a real user gesture (click/tap).
 * It pre-warms both the <audio> element and the SpeechSynthesis engine
 * so subsequent programmatic calls succeed without autoplay blocks.
 */
export const unlockAudio = () => {
  if (audioUnlocked) return;
  audioUnlocked = true;

  // Warm up <audio>
  if (dingAudio) {
    dingAudio.play().then(() => {
      dingAudio.pause();
      dingAudio.currentTime = 0;
    }).catch(() => {});
  }

  // Warm up SpeechSynthesis — speak a silent empty utterance
  if (window.speechSynthesis) {
    const warmup = new SpeechSynthesisUtterance(" ");
    warmup.volume = 0;
    window.speechSynthesis.speak(warmup);
    // Ensure voices are loaded
    window.speechSynthesis.getVoices();
  }
};

const playDing = () => {
  if (!dingAudio || !audioUnlocked) return;
  dingAudio.currentTime = 0;
  dingAudio.play().catch(() => {});
};

// ── Voice announcement via Web Speech API ────────────────────────────────────
const speakText = (text) => {
  if (!window.speechSynthesis || !audioUnlocked) return;
  // Cancel any pending speech
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.85;
  utter.pitch = 1.0;
  utter.volume = 1.0;

  const doSpeak = () => {
    const voices = window.speechSynthesis.getVoices();
    const pick =
      voices.find((v) => v.lang === "en-IN") ||
      voices.find((v) => v.lang.startsWith("en") && /female|woman/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (pick) utter.voice = pick;
    window.speechSynthesis.speak(utter);
  };

  if (window.speechSynthesis.getVoices().length > 0) {
    doSpeak();
  } else {
    window.speechSynthesis.onvoiceschanged = doSpeak;
  }
};

// ── Main speak export (called from AdminLayout) ───────────────────────────────
export const speak = (order) => {
  if (!audioUnlocked) return; // silently ignore if not unlocked yet
  playDing();
  const name =
    order.customerName && order.customerName !== "Walk-in Customer"
      ? `Customer ${order.customerName}.`
      : "";
  const text = `New order! ${name} Order number ${order.orderNumber}. Total rupees ${order.total}.`;
  setTimeout(() => speakText(text), 700);
};

// ── Audio Unlock Banner ───────────────────────────────────────────────────────
export const AudioUnlockBanner = () => {
  const [unlocked, setUnlocked] = useState(audioUnlocked);

  const handleUnlock = () => {
    unlockAudio();
    setUnlocked(true);
  };

  if (unlocked) return null;

  return (
    <div className="audio-unlock-banner" onClick={handleUnlock}>
      <span className="audio-unlock-icon">🔇</span>
      <span className="audio-unlock-text">
        <strong>Tap here to enable order alerts &amp; voice</strong>
        <small>Browser requires one tap to allow audio</small>
      </span>
      <span className="audio-unlock-btn">Enable Now →</span>
    </div>
  );
};

// ── Single notification card ──────────────────────────────────────────────────
const NotifCard = ({ order, queueLength, onDismiss, onConfirm }) => {
  const [dismissing, setDismissing] = useState(false);

  const dismiss = useCallback(() => {
    window.speechSynthesis?.cancel();
    setDismissing(true);
    setTimeout(onDismiss, 280);
  }, [onDismiss]);

  const confirm = useCallback(() => {
    window.speechSynthesis?.cancel();
    setDismissing(true);
    setTimeout(onConfirm, 280);
  }, [onConfirm]);

  const orderType = order.orderType === "Counter" ? "🔳 Counter" : "🌐 Website Order";

  return (
    <div className={`notif-card${dismissing ? " is-dismissing" : ""}`}>
      <div className="notif-header">
        <div className="notif-badge">
          <span className="notif-badge-icon">🔔</span>
          {queueLength > 1 ? `Pending Orders: ${queueLength}` : "New Order!"}
        </div>
        <button className="notif-close" onClick={dismiss} aria-label="Dismiss">✕</button>
      </div>

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

      <div className="notif-actions">
        <button
          className="notif-btn-print"
          onClick={() => printBill(order)}
        >
          🖨 Print Bill
        </button>
        <button className="notif-btn-confirm" onClick={confirm}>
          ✅ Confirm &amp; Next
        </button>
      </div>
    </div>
  );
};

// ── Notification stack (rendered in AdminLayout) ──────────────────────────────
const OrderNotifications = ({ orders, isOpen, onClose, onDismiss, onConfirm }) => {
  if (orders.length === 0) return null;

  const order = orders[0];

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
