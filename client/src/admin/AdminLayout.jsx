import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import "../css/admin.css";

const AdminLayout = () => {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span className="navbar-brand-mark">CH</span>
          <div>
            Chamundeshwari
            <small>Owner Panel</small>
          </div>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" end>📊 Dashboard</NavLink>
          <NavLink to="/admin/products">🍬 Products</NavLink>
          <NavLink to="/admin/orders">📦 Orders</NavLink>
          <NavLink to="/admin/qr">🔳 Counter QR</NavLink>
          <NavLink to="/admin/feedback">💬 Feedback</NavLink>
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
