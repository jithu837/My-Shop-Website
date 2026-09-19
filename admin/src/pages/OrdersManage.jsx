import React, { useEffect, useState, useCallback } from "react";
import api from "../services/api.js";
import printBill from "../utils/printBill.js";
import useOrderStream from "../hooks/useOrderStream.js";
import "../css/admin.css";

const STATUSES = ["All", "New", "Accepted", "Packed", "Dispatched", "Delivered", "Cancelled"];
const ORDER_TYPES = ["All", "Counter", "Delivery"];

const OrdersManage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("asc"); // Default 'asc' for FIFO
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/orders", { params: { status: statusFilter, orderType: typeFilter, sort: sortOrder } })
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }, [statusFilter, typeFilter, sortOrder]);

  // Reload list from server whenever filters change.
  useEffect(() => { load(); }, [load]);

  // When switching to 'New' status, automatically switch to FIFO so earliest order is handled first
  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    if (newStatus === "New") {
      setSortOrder("asc");
    }
  };

  // Also auto-refresh when a new order comes in via the SSE stream.
  useOrderStream((event) => {
    if (event.__event === "order-updated" || event.__event === "new-order") load();
  });

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/orders/${id}/status`, { status });
    } catch (err) {
      alert(err.response?.data?.message || "Could not update status");
    } finally {
      load();
    }
  };

  const updatePayment = async (id, paymentStatus) => {
    try {
      await api.patch(`/orders/${id}/status`, { paymentStatus });
    } catch (err) {
      alert(err.response?.data?.message || "Could not update payment status");
    } finally {
      load();
    }
  };

  const completeOrder = async (id) => {
    try {
      await api.patch(`/orders/${id}/status`, { status: "Delivered", paymentStatus: "Paid" });
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Could not complete order");
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div>
          <h1 style={{ marginBottom: 4 }}>📦 Order Management</h1>
          <p style={{ margin: 0, color: "var(--color-cream)", opacity: 0.8, fontSize: "0.95rem" }}>
            {sortOrder === "asc" ? "⚡ First-In, First-Out (FIFO) queue order" : "🕒 Newest-first order list"}
          </p>
        </div>
        <div className="admin-toolbar-filters" style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {ORDER_TYPES.map((t) => <option key={t} value={t}>{t === "All" ? "All Types" : t}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => handleStatusFilterChange(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} title="Change Queue Sorting Order">
            <option value="asc">⚡ FIFO (Oldest / Queue First)</option>
            <option value="desc">🕒 LIFO (Newest First)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : orders.length === 0 ? (
        <p className="empty-state">No orders in this filter.</p>
      ) : (
        <div className="admin-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Token # &amp; Queue</th>
                <th>Type</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Placed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, idx) => (
                <React.Fragment key={o._id}>
                  <tr>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        {sortOrder === "asc" && (o.status === "New" || o.status === "Accepted") && (
                          <span
                            style={{
                              background: idx === 0 ? "#22c55e" : "var(--color-brass)",
                              color: "#000",
                              fontWeight: 800,
                              fontSize: "0.75rem",
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}
                            title={`Position #${idx + 1} in FIFO queue`}
                          >
                            #{idx + 1}
                          </span>
                        )}
                        <strong style={{ color: "var(--color-brass-light)", fontSize: "1.05rem", letterSpacing: "0.03em" }}>
                          TOKEN #{o.orderNumber}
                        </strong>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${o.orderType === "Counter" ? "badge-brass" : "badge-leaf"}`}>
                        {o.orderType === "Counter" ? "🔳 Counter" : "🌐 Website"}
                      </span>
                    </td>
                    <td>
                      <strong>{o.customerName || "Walk-in"}</strong>
                      {o.customerPhone && <><br /><small style={{ color: "var(--color-brass-light)" }}>📞 {o.customerPhone}</small></>}
                    </td>
                    <td>{o.items.length} item(s)</td>
                    <td style={{ fontWeight: 700, color: "var(--color-brass-light)" }}>₹{o.total}</td>
                    <td>
                      <div style={{ fontSize: "0.85rem", marginBottom: "4px" }}>{o.paymentMethod}</div>
                      <select className="status-select" value={o.paymentStatus} onChange={(e) => updatePayment(o._id, e.target.value)}>
                        <option>Pending</option><option>Paid</option><option>Failed</option>
                      </select>
                    </td>
                    <td>
                      <select className="status-select" value={o.status} onChange={(e) => updateStatus(o._id, e.target.value)}>
                        {STATUSES.filter((s) => s !== "All").map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>
                      {new Date(o.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      <br />
                      <small style={{ opacity: 0.7 }}>
                        {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </small>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        {o.status !== "Delivered" && (
                          <button
                            className="btn btn-primary btn-small"
                            style={{ padding: "4px 8px", fontSize: "0.78rem", background: "#166534" }}
                            onClick={() => completeOrder(o._id)}
                            title="Mark Delivered & Paid in one click"
                          >
                            ✅ Done
                          </button>
                        )}
                        <button
                          className="btn btn-brass btn-small"
                          style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                          onClick={() => printBill(o)}
                          title="Print Receipt"
                        >
                          🖨
                        </button>
                        <button
                          className="btn btn-outline btn-small"
                          style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                          onClick={() => setExpanded(expanded === o._id ? null : o._id)}
                        >
                          {expanded === o._id ? "Hide" : "View"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === o._id && (
                    <tr>
                      <td colSpan="9">
                        <div className="order-detail-panel">
                          {o.orderType === "Counter" ? (
                            <p><strong>Counter order</strong> — customer collects at the shop.</p>
                          ) : (
                            <p><strong>Website order</strong> — customer collects at the shop.</p>
                          )}
                          <table className="admin-table">
                            <thead><tr><th>Item</th><th>Qty</th><th>Rate/kg</th><th>Amount</th></tr></thead>
                            <tbody>
                              {o.items.map((item, i) => (
                                <tr key={i}><td>{item.name}</td><td>{item.grams}g</td><td>₹{item.pricePerKg}</td><td>₹{item.lineTotal}</td></tr>
                              ))}
</tbody>
                          </table>
                          <button className="btn btn-brass btn-small" onClick={() => printBill(o)}>Print Bill</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrdersManage;
