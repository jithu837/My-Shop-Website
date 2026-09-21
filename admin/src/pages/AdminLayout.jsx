import React, { useState, useCallback, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import useOrderStream from "../hooks/useOrderStream.js";
import OrderNotifications, { speak, unlockAudio } from "../components/OrderNotifications.jsx";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import "../css/admin.css";

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Auto-unlock audio on first user interaction so voice plays without a manual tap
  useEffect(() => {
    const unlock = () => { unlockAudio(); document.removeEventListener("click", unlock); document.removeEventListener("keydown", unlock); };
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
    return () => { document.removeEventListener("click", unlock); document.removeEventListener("keydown", unlock); };
  }, []);

  // useCallback keeps the reference stable so useOrderStream never re-subscribes.
  const handleNewOrder = useCallback((order) => {
    if (order.__event === "order-updated") return;
    // 1. Announce with voice focusing on Token number
    speak(order);
    // 2. Add to notification queue in strict FIFO order (oldest first, new at end)
    setNotifications((prev) => {
      if (prev.some((o) => o._id === order._id || o.orderNumber === order.orderNumber)) {
        return prev;
      }
      const updated = [...prev, order];
      return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });
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

  // Fetch existing "New" orders when the admin panel is first opened/refreshed (FIFO: oldest first)
  useEffect(() => {
    api.get("/orders", { params: { status: "New", sort: "asc" } })
      .then((res) => {
        const newOrders = res.data;
        if (newOrders && newOrders.length > 0) {
          // Strict FIFO: earliest placed order is always first
          const fifoOrders = [...newOrders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          setNotifications(fifoOrders);
          setIsNotifOpen(true);
          // Announce first token in queue
          speak(fifoOrders[0]);
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
          <NavLink to="/customers">👥 Customers</NavLink>
          <NavLink to="/qr">🔳 Counter QR</NavLink>
          <NavLink to="/feedback">💬 Feedback</NavLink>
          
          <button 
            className={`admin-nav-notif ${notifications.length > 0 ? "has-alerts" : ""}`}
            onClick={() => setIsNotifOpen(!isNotifOpen)}
          >
            🔔 Queue ({notifications.length})
          </button>


        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <span className="admin-user-dot" title="Active Session" />
            <div>
              <span className="admin-user-title">{user?.name || "Owner"}</span>
              <span className="admin-user-phone">{user?.phone || "7816096147"}</span>
            </div>
          </div>
          <button
            type="button"
            className="admin-logout-btn"
            onClick={logout}
            title="Sign Out of Dashboard"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
