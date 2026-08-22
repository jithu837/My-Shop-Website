import React, { useState, useCallback, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import useOrderStream from "../hooks/useOrderStream.js";
import OrderNotifications, { speak } from "../components/OrderNotifications.jsx";
import api from "../services/api.js";
import "../css/admin.css";

const AdminLayout = () => {
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // useCallback keeps the reference stable so useOrderStream never re-subscribes.
  const handleNewOrder = useCallback((order) => {
    // 1. Announce with voice
    speak(order);
    // 2. Add to the visible notification stack
    setNotifications((prev) => [...prev, order]);
    // 3. Auto-open drawer
    setIsNotifOpen(true);
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((o) => o._id !== id));
  }, []);

  const confirmOrder = useCallback(async (id) => {
    try {
      await api.patch(`/orders/${id}/status`, { status: "Delivered", paymentStatus: "Paid" });
      setNotifications((prev) => prev.filter((o) => o._id !== id));
    } catch (err) {
      console.error("Could not confirm order", err);
      // fallback dismiss if api fails so it doesn't get stuck
      setNotifications((prev) => prev.filter((o) => o._id !== id));
    }
  }, []);

  useOrderStream(handleNewOrder);

  // Fetch existing "New" orders when the admin panel is first opened/refreshed
  useEffect(() => {
    api.get("/orders", { params: { status: "New" } })
      .then((res) => {
        const newOrders = res.data;
        if (newOrders && newOrders.length > 0) {
          setNotifications(newOrders);
          setIsNotifOpen(true);
          // Just speak the latest one so it doesn't overlap excessively
          speak(newOrders[0]);
        }
      })
      .catch((err) => console.error("Could not fetch initial pending orders:", err));
  }, []);

  return (
    <div className="admin-shell">
      {/* Real-time order notification cards */}
      <OrderNotifications 
        orders={notifications} 
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onDismiss={dismissNotification} 
        onConfirm={confirmOrder} 
      />

      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span className="navbar-brand-mark">CH</span>
          <div>
            Chamundeshwari
            <small>Owner Panel</small>
          </div>
        </div>

        <nav className="admin-nav">
          <NavLink to="/" end>📊 Dashboard</NavLink>
          <NavLink to="/products">🍬 Products</NavLink>
          <NavLink to="/orders">📦 Orders</NavLink>
          <NavLink to="/qr">🔳 Counter QR</NavLink>
          <NavLink to="/feedback">💬 Feedback</NavLink>
          
          <button 
            className={`admin-nav-notif ${notifications.length > 0 ? "has-alerts" : ""}`}
            onClick={() => setIsNotifOpen(!isNotifOpen)}
          >
            🔔 Queue ({notifications.length})
          </button>

          <button 
            className="admin-nav-notif" 
            style={{ marginTop: '4px', textAlign: 'left', opacity: 0.8 }}
            onClick={() => speak({ orderNumber: "Test", total: 0, customerName: "Test" })}
          >
            🔊 Test Sound
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user">Owner</div>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
