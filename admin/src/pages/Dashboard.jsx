import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api, { imageUrl } from "../services/api.js";
import printBill from "../utils/printBill.js";
import useOrderStream from "../hooks/useOrderStream.js";
import "../css/admin.css";

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const isToday = d.toDateString() === now.toDateString();
  return isToday ? `Today, ${timeStr}` : `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}, ${timeStr}`;
};

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [graph, setGraph] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    Promise.all([
      api.get("/dashboard/summary"),
      api.get("/dashboard/revenue-graph"),
    ])
      .then(([summaryResponse, graphResponse]) => {
        setSummary(summaryResponse.data);
        setGraph(graphResponse.data);
      })
      .catch((requestError) => {
        setError(requestError.response?.data?.message || "Could not load dashboard data.");
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh dashboard stats whenever a new order is placed.
  useOrderStream(load);

  if (error) {
    return (
      <div className="admin-load-error">
        <p>{error}</p>
        <button className="btn btn-primary" onClick={load}>Try Again</button>
      </div>
    );
  }

  if (!summary) return <div className="spinner" />;

  const maxRevenue = Math.max(...graph.map((g) => g.total), 1);
  const recentOrders = summary.recentCustomerHistory || [];

  return (
    <div>
      <h1>Dashboard</h1>

      <div className="admin-stats-grid">
        <StatCard label="Today's Sales" value={summary.todaySalesCount} to="/orders" />
        <StatCard label="Today's Collection" value={`₹${summary.todayCollection}`} />
        <StatCard label="Monthly Collection" value={`₹${summary.monthlyCollection}`} />
        <StatCard label="Total Customers" value={summary.totalCustomers} to="/customers" />
        <StatCard label="Pending Orders" value={summary.pendingOrders} to="/orders" />
        <StatCard label="Delivered Orders" value={summary.deliveredOrders} to="/orders" />
        <StatCard label="Cancelled Orders" value={summary.cancelledOrders} to="/orders" />
        <StatCard label="Avg. Feedback Rating" value={summary.feedbackCount ? `★ ${summary.avgRating}` : "—"} to="/feedback" />
      </div>

      {/* ─── Recent Customer Purchase History ───────────────────────────── */}
      <div className="admin-panel" style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🕒</span>
              <span>Recent Customer History</span>
              <span className="badge badge-brass" style={{ fontSize: "0.8rem", padding: "2px 8px" }}>
                {recentOrders.length} Latest Orders
              </span>
            </h3>
            <p style={{ margin: "4px 0 0 0", color: "var(--color-ink-soft)", fontSize: "0.88rem", fontWeight: 500 }}>
              Latest customer purchases, sweets ordered, token numbers and quick receipt printing.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link to="/orders" className="btn btn-outline btn-small" style={{ fontWeight: 700 }}>
              View All Orders →
            </Link>
            <Link to="/customers" className="btn btn-primary btn-small" style={{ fontWeight: 700 }}>
              👥 Customer Directory →
            </Link>
          </div>
        </div>

        {recentOrders.length === 0 ? (
          <p className="empty-state">No recent customer orders yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Token &amp; Type</th>
                  <th>Customer</th>
                  <th>Sweets / Items Ordered</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((ord) => (
                  <tr key={ord._id}>
                    <td>
                      <div>
                        <strong style={{ color: "var(--color-maroon)", fontSize: "1rem", fontWeight: 800, display: "block" }}>
                          TOKEN #{ord.tokenNumber || ord.orderNumber}
                        </strong>
                        <span className={`badge ${ord.orderType === "Counter" ? "badge-brass" : "badge-leaf"}`} style={{ fontSize: "0.72rem", padding: "2px 6px", fontWeight: 700 }}>
                          {ord.orderType === "Counter" ? "🔳 Counter" : "🌐 Website"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#1F140E" }}>
                        {ord.customerName || "Walk-in Customer"}
                      </div>
                      {ord.customerPhone ? (
                        <small style={{ color: "var(--color-maroon)", fontSize: "0.82rem", fontWeight: 700 }}>
                          📞 {ord.customerPhone}
                        </small>
                      ) : (
                        <small style={{ color: "var(--color-ink-soft)", fontSize: "0.8rem", fontWeight: 600 }}>Walk-in</small>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxWidth: "340px" }}>
                        {ord.items?.map((item, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: "#F5EFEB",
                              border: "1px solid rgba(107, 30, 35, 0.16)",
                              borderRadius: "4px",
                              padding: "3px 8px",
                              fontSize: "0.82rem",
                              color: "#1F140E",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.name} ({item.grams >= 1000 ? `${item.grams / 1000}kg` : `${item.grams}g`})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontWeight: 800, color: "var(--color-maroon)", fontSize: "1.05rem" }}>
                      ₹{ord.total}
                    </td>
                    <td>
                      <span
                        className={`badge ${ord.paymentStatus === "Paid" ? "badge-leaf" : "badge-danger"}`}
                        style={{ fontSize: "0.75rem", padding: "3px 7px", fontWeight: 700 }}
                      >
                        {ord.paymentStatus === "Paid" ? "✓ Paid" : "Pending"}
                      </span>
                      <small style={{ display: "block", marginTop: "2px", color: "var(--color-ink-soft)", fontSize: "0.75rem", fontWeight: 600 }}>
                        {ord.paymentMethod}
                      </small>
                    </td>
                    <td>
                      <span className="badge" style={{ background: "#E2E8F0", color: "#1E293B", fontSize: "0.75rem", padding: "3px 7px", fontWeight: 700 }}>
                        {ord.status}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.85rem", whiteSpace: "nowrap", color: "var(--color-ink)", fontWeight: 600 }}>
                      {formatTime(ord.createdAt)}
                    </td>
                    <td>
                      <button
                        className="btn btn-brass btn-small"
                        style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                        onClick={() => printBill(ord)}
                        title="Print 80mm Receipt"
                      >
                        🖨 Bill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-panel" style={{ marginTop: "24px" }}>
        <h3>Revenue — Last 7 Days</h3>
        <div className="revenue-graph">
          {graph.map((g) => (
            <div className="revenue-bar-col" key={g.date}>
              <div className="revenue-bar" style={{ height: `${(g.total / maxRevenue) * 120 || 2}px` }} title={`₹${g.total}`} />
              <span>{new Date(g.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-two-col">
        <div className="admin-panel">
          <h3>⚠️ Low Stock ({summary.lowStockProducts.length})</h3>
          {summary.lowStockProducts.length === 0 ? (
            <p className="empty-state">All products are well stocked.</p>
          ) : (
            <table className="admin-table">
              <tbody>
                {summary.lowStockProducts.map((p) => (
                  <tr key={p._id}>
                    <td><img src={imageUrl(p)} alt="" /></td>
                    <td>{p.name}</td>
                    <td>{p.stockGrams}g left</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin-panel">
          <h3>🏆 Best Selling</h3>
          <table className="admin-table">
            <tbody>
              {summary.bestSelling.map((p) => (
                <tr key={p._id}>
                  <td><img src={imageUrl(p)} alt="" /></td>
                  <td>{p.name}</td>
                  <td>{(p.soldGrams / 1000).toFixed(1)} kg sold</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, to }) => {
  const content = (
    <div className="admin-stat-card" style={to ? { cursor: "pointer", transition: "transform 0.15s ease" } : undefined}>
      <div className="admin-stat-label">
        {label} {to && <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>→</span>}
      </div>
      <div className="admin-stat-value">{value}</div>
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>{content}</Link> : content;
};

export default Dashboard;
