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
  const token = order.tokenNumber || order.orderNumber;
  const name =
    order.customerName && order.customerName !== "Walk-in Customer"
      ? `from ${order.customerName}.`
      : "";
  const text = `Token number ${token}. New order ${name} Total rupees ${order.total}. First in line.`;
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

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 45) return "Just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

// ── Single notification card (FIFO Current Turn) ───────────────────────────────
const NotifCard = ({ order, queueIndex = 0, queueLength, nextOrder, onDismiss, onConfirm }) => {
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
      {/* FIFO Priority & Token Header */}
      <div className="notif-header" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="notif-badge" style={{ fontSize: "0.95rem" }}>
            <span className="notif-badge-icon">🔔</span>
            <span style={{ color: "#4ade80", fontWeight: 800 }}>
              {queueIndex === 0 ? "👉 #1 IN QUEUE (FIRST IN, FIRST OUT)" : `#${queueIndex + 1} In Queue`}
            </span>
          </div>
          <button className="notif-close" onClick={dismiss} aria-label="Dismiss">✕</button>
        </div>

        {/* Large Prominent Token Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(201,138,44,0.35), rgba(123,21,33,0.4))",
            border: "2px solid var(--color-brass)",
            borderRadius: "10px",
            padding: "10px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(251,243,231,0.7)" }}>
              Today's Token (Daily Reset)
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--color-brass-light)", letterSpacing: "0.04em", lineHeight: 1.1 }}>
              TOKEN #{order.tokenNumber || order.orderNumber}
            </div>
            {order.tokenNumber && (
              <small style={{ color: "rgba(251,243,231,0.5)", fontSize: "0.75rem", display: "block", marginTop: "2px" }}>
                Ref: {order.orderNumber}
              </small>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.78rem", color: "rgba(251,243,231,0.65)" }}>Placed</div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fbf3e7" }}>
              {formatTimeAgo(order.createdAt)}
            </div>
          </div>
        </div>
      </div>

      <div className="notif-body" style={{ paddingTop: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
          <div className="notif-customer" style={{ margin: 0 }}>
            {order.customerName || "Walk-in Customer"}
          </div>
          {order.customerPhone && (
            <div style={{ fontSize: "0.95rem", color: "var(--color-brass-light)", fontWeight: 600 }}>
              📞 {order.customerPhone}
            </div>
          )}
        </div>

        <div className="notif-meta">
          <span className="notif-chip is-total">₹{order.total}</span>
          <span className="notif-chip">{orderType}</span>
          <span className="notif-chip">💳 {order.paymentMethod}</span>
          <span className="notif-chip" style={{ background: order.paymentStatus === "Paid" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", color: order.paymentStatus === "Paid" ? "#4ade80" : "#f87171" }}>
            ● {order.paymentStatus}
          </span>
        </div>

        <div className="notif-items">
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-brass-light)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
            Items to prepare:
          </div>
          {order.items?.map((item, idx) => (
            <div key={item._id || idx} className="notif-item-row">
              <span className="notif-item-name" style={{ fontWeight: 600 }}>{item.name}</span>
              <span className="notif-item-qty" style={{ fontWeight: 700, color: "var(--color-brass-light)" }}>
                {item.grams >= 1000 ? `${item.grams / 1000}kg` : `${item.grams}g`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="notif-actions" style={{ padding: "14px 16px" }}>
        <button
          className="notif-btn-print"
          onClick={() => printBill(order)}
        >
          🖨 Print Bill
        </button>
        <button className="notif-btn-confirm" onClick={confirm} style={{ flex: 1.5 }}>
          {nextOrder ? `✅ Deliver & Call #${nextOrder.tokenNumber || nextOrder.orderNumber} →` : "✅ Complete Order"}
        </button>
      </div>
    </div>
  );
};

// ── Notification drawer (rendered in AdminLayout) ──────────────────────────────
const OrderNotifications = ({ orders, isOpen, onClose, onDismiss, onConfirm }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keep index within bounds if orders array changes
  useEffect(() => {
    if (selectedIndex >= orders.length) {
      setSelectedIndex(0);
    }
  }, [orders.length, selectedIndex]);

  if (orders.length === 0) return null;

  const activeOrder = orders[selectedIndex] || orders[0];
  const nextOrder = orders.length > 1 ? orders[1] : null;

  return (
    <div className={`notif-drawer-overlay ${isOpen ? "is-open" : ""}`}>
      <div className="notif-drawer-backdrop" onClick={onClose} />
      <div className="notif-drawer" role="status" aria-live="polite">
        <div className="notif-drawer-header">
          <div>
            <h3 style={{ margin: 0, fontSize: "1.35rem" }}>FIFO Order Queue</h3>
            <small style={{ color: "rgba(251,243,231,0.7)", fontSize: "0.85rem" }}>
              First-In, First-Out · {orders.length} order{orders.length === 1 ? "" : "s"} waiting
            </small>
          </div>
          <button className="notif-drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="notif-drawer-body">
          {/* Active / Current Order Card */}
          <NotifCard
            key={activeOrder._id}
            order={activeOrder}
            queueIndex={selectedIndex}
            queueLength={orders.length}
            nextOrder={nextOrder}
            onDismiss={() => {
              if (orders.length === 1) onClose();
              onDismiss(activeOrder._id);
            }}
            onConfirm={() => {
              if (orders.length === 1) onClose();
              onConfirm(activeOrder._id);
            }}
          />

          {/* Upcoming In Queue (Who Ordered Next) */}
          {orders.length > 1 && (
            <div style={{ marginTop: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--color-brass-light)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  ⏳ Next In Line ({orders.length - 1} waiting)
                </span>
                <span style={{ fontSize: "0.8rem", color: "rgba(251,243,231,0.6)" }}>
                  Strict Order Sequence
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {orders.slice(1).map((ord, idx) => {
                  const actualIdx = idx + 1;
                  const isCurrentSelected = selectedIndex === actualIdx;
                  return (
                    <div
                      key={ord._id}
                      onClick={() => setSelectedIndex(actualIdx)}
                      style={{
                        background: isCurrentSelected ? "rgba(201,138,44,0.25)" : "rgba(0, 0, 0, 0.35)",
                        border: isCurrentSelected ? "1px solid var(--color-brass)" : "1px solid rgba(251, 243, 231, 0.1)",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                      title="Click to view this order in detail"
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            background: "var(--color-brass)",
                            color: "var(--color-maroon-deep)",
                            fontWeight: 800,
                            borderRadius: "4px",
                            padding: "2px 6px",
                            fontSize: "0.8rem",
                          }}
                        >
                          #{actualIdx + 1}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--color-brass-light)", fontSize: "0.95rem" }}>
                            TOKEN #{ord.tokenNumber || ord.orderNumber}
                          </div>
                          <div style={{ fontSize: "0.82rem", color: "var(--color-cream)", opacity: 0.9 }}>
                            {ord.customerName || "Walk-in"} · {ord.items?.length || 0} item(s)
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: "#fbf3e7", fontSize: "0.95rem" }}>
                          ₹{ord.total}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "rgba(251,243,231,0.6)" }}>
                          {formatTimeAgo(ord.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderNotifications;
