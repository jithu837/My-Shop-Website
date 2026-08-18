import React, { useState, useCallback } from "react";
import { NavLink, Outlet } from "react-router-dom";
import useOrderStream from "../hooks/useOrderStream.js";
import OrderNotifications, { speak } from "../components/OrderNotifications.jsx";
import "../css/admin.css";

const AdminLayout = () => {
  const [notifications, setNotifications] = useState([]);

  // useCallback keeps the reference stable so useOrderStream never re-subscribes.
  const handleNewOrder = useCallback((order) => {
    // 1. Announce with voice
    speak(order);
    // 2. Add to the visible notification stack
    setNotifications((prev) => [...prev, order]);
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((o) => o._id !== id));
  }, []);

  useOrderStream(handleNewOrder);

  return (
    <div className="admin-shell">
      {/* Real-time order notification cards (top-right corner) */}
      <OrderNotifications orders={notifications} onDismiss={dismissNotification} />

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
