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
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/orders", { params: { status: statusFilter, orderType: typeFilter } })
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }, [statusFilter, typeFilter]);

  // Reload list from server whenever filters change.
  useEffect(() => { load(); }, [load]);

  // Also auto-refresh when a new order comes in via the SSE stream.
  useOrderStream(load);

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

  return (
    <div>
      <div className="admin-toolbar">
        <h1 style={{ marginBottom: 0 }}>Orders</h1>
        <div className="admin-toolbar-filters">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {ORDER_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
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
                <th>Order #</th><th>Type</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Placed</th><th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <React.Fragment key={o._id}>
                  <tr>
                    <td>{o.orderNumber}</td>
                    <td>
                      <span className={`badge ${o.orderType === "Counter" ? "badge-brass" : "badge-leaf"}`}>
                        {o.orderType === "Counter" ? "🔳 Counter" : "🚚 Delivery"}
                      </span>
                    </td>
                    <td>{o.customerName}{o.customerPhone && <><br /><small>{o.customerPhone}</small></>}</td>
                    <td>{o.items.length} item(s)</td>
                    <td>₹{o.total}</td>
                    <td>
                      {o.paymentMethod} ·{" "}
                      <select className="status-select" value={o.paymentStatus} onChange={(e) => updatePayment(o._id, e.target.value)}>
                        <option>Pending</option><option>Paid</option><option>Failed</option>
                      </select>
                    </td>
                    <td>
                      <select className="status-select" value={o.status} onChange={(e) => updateStatus(o._id, e.target.value)}>
                        {STATUSES.filter((s) => s !== "All").map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>
                      <button className="btn btn-outline btn-small" onClick={() => setExpanded(expanded === o._id ? null : o._id)}>
                        {expanded === o._id ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  {expanded === o._id && (
                    <tr>
                      <td colSpan="9">
                        <div className="order-detail-panel">
                          {o.orderType === "Counter" ? (
                            <p><strong>Counter order</strong> — customer collects at the shop, no delivery.</p>
                          ) : (
                            <p><strong>Delivery address:</strong> {o.customerAddress}</p>
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
