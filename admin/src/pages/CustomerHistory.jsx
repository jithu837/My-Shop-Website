import React, { useEffect, useState, useMemo } from "react";
import api from "../services/api.js";
import printBill from "../utils/printBill.js";
import "../css/admin.css";

const CustomerHistory = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all', 'repeat', 'single'
  const [sortBy, setSortBy] = useState("recent"); // 'recent', 'spent', 'orders'
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);

  const fetchCustomers = () => {
    setLoading(true);
    setError("");
    api.get("/orders/customers")
      .then((res) => {
        setCustomers(res.data || []);
      })
      .catch((err) => {
        console.error("Could not fetch customer history:", err);
        setError(err.response?.data?.message || "Could not load customer history. Please try again.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        // Filter type
        if (filterType === "repeat" && c.totalOrders < 2) return false;
        if (filterType === "single" && c.totalOrders !== 1) return false;

        // Search query
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const matchesName = (c.customerName || "").toLowerCase().includes(q);
        const matchesPhone = (c.customerPhone || "").toLowerCase().includes(q);
        const matchesAddress = (c.customerAddress || "").toLowerCase().includes(q);
        const matchesItem = c.purchasedItems?.some((item) =>
          item.name.toLowerCase().includes(q)
        );

        return matchesName || matchesPhone || matchesAddress || matchesItem;
      })
      .sort((a, b) => {
        if (sortBy === "spent") return b.totalSpent - a.totalSpent;
        if (sortBy === "orders") return b.totalOrders - a.totalOrders;
        // Default: most recent order
        return new Date(b.lastOrderAt) - new Date(a.lastOrderAt);
      });
  }, [customers, search, filterType, sortBy]);

  // Overall analytics stats
  const stats = useMemo(() => {
    const totalCust = customers.length;
    const repeatCust = customers.filter((c) => c.totalOrders > 1).length;
    const totalOrders = customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0);
    const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    return { totalCust, repeatCust, totalOrders, totalRevenue };
  }, [customers]);

  const toggleExpand = (id) => {
    setExpandedCustomerId((prev) => (prev === id ? null : id));
  };

  const formatWeight = (grams) => {
    if (!grams) return "0g";
    if (grams >= 1000) {
      const kg = grams / 1000;
      return `${Number.isInteger(kg) ? kg : kg.toFixed(2)} kg`;
    }
    return `${grams}g`;
  };

  return (
    <div className="customer-history-page">
      {/* Top Toolbar */}
      <div className="admin-toolbar">
        <div>
          <h1 style={{ marginBottom: 4, color: "var(--color-maroon-deep)" }}>👥 Customer Purchase History</h1>
          <p style={{ margin: 0, color: "var(--color-ink-soft)", fontSize: "0.95rem", fontWeight: 500 }}>
            Complete breakdown of customer purchases, sweets ordered, quantities, and order timeline.
          </p>
        </div>
        <button className="btn btn-outline btn-small" onClick={fetchCustomers} title="Refresh customer data">
          🔄 Refresh
        </button>
      </div>

      {/* Metric Cards */}
      <div className="admin-stats-grid" style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Customers</div>
          <div className="admin-stat-value" style={{ color: "var(--color-maroon-deep)", fontWeight: 800 }}>{stats.totalCust}</div>
          <small style={{ color: "var(--color-ink-soft)", fontWeight: 500 }}>Unique contacts/accounts</small>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Repeat Customers</div>
          <div className="admin-stat-value" style={{ color: "#166534", fontWeight: 800 }}>{stats.repeatCust}</div>
          <small style={{ color: "var(--color-ink-soft)", fontWeight: 500 }}>Ordered 2 or more times</small>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Customer Orders</div>
          <div className="admin-stat-value" style={{ color: "var(--color-maroon-deep)", fontWeight: 800 }}>{stats.totalOrders}</div>
          <small style={{ color: "var(--color-ink-soft)", fontWeight: 500 }}>Across counter &amp; web</small>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Lifetime Spend</div>
          <div className="admin-stat-value" style={{ color: "var(--color-maroon)", fontWeight: 800 }}>
            ₹{stats.totalRevenue.toLocaleString("en-IN")}
          </div>
          <small style={{ color: "var(--color-ink-soft)", fontWeight: 500 }}>Combined revenue</small>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="admin-panel" style={{ marginBottom: "1.5rem", padding: "16px 20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: "1 1 320px", position: "relative" }}>
            <input
              type="text"
              placeholder="🔍 Search by customer name, phone, or sweet (e.g. Ladoo, Kaju)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                background: "#FFFFFF",
                border: "1.5px solid rgba(107, 30, 35, 0.25)",
                color: "var(--color-ink)",
                fontSize: "0.95rem",
                fontWeight: 600,
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--color-ink-soft)",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "bold",
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ fontSize: "0.9rem", color: "var(--color-ink)", fontWeight: 700 }}>Filter:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="status-select"
              style={{ minWidth: "150px", background: "#FFFFFF", color: "var(--color-ink)", border: "1.5px solid rgba(107, 30, 35, 0.25)", fontWeight: 600 }}
            >
              <option value="all">All Customers ({customers.length})</option>
              <option value="repeat">Repeat Only ({stats.repeatCust})</option>
              <option value="single">Single Order ({customers.length - stats.repeatCust})</option>
            </select>

            <label style={{ fontSize: "0.9rem", color: "var(--color-ink)", fontWeight: 700, marginLeft: "8px" }}>Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="status-select"
              style={{ minWidth: "160px", background: "#FFFFFF", color: "var(--color-ink)", border: "1.5px solid rgba(107, 30, 35, 0.25)", fontWeight: 600 }}
            >
              <option value="recent">Most Recent Order</option>
              <option value="spent">Highest Spend (₹)</option>
              <option value="orders">Most Orders Placed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer List Content */}
      {loading ? (
        <div className="spinner" style={{ margin: "40px auto" }} />
      ) : error ? (
        <div className="admin-load-error">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchCustomers}>Try Again</button>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="admin-panel" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p className="empty-state" style={{ fontSize: "1.1rem", marginBottom: "10px" }}>
            {search ? `No customers found matching "${search}".` : "No customer purchase history yet."}
          </p>
          {search && (
            <button className="btn btn-outline btn-small" onClick={() => setSearch("")}>
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filteredCustomers.map((cust) => {
            const isExpanded = expandedCustomerId === cust.id;
            const cleanPhone = (cust.customerPhone || "").replace(/\D/g, "");

            return (
              <div
                key={cust.id}
                className="admin-panel customer-card"
                style={{
                  border: isExpanded ? "2px solid var(--color-brass)" : "1.5px solid rgba(107, 30, 35, 0.14)",
                  borderRadius: "12px",
                  background: "#FFFFFF",
                  boxShadow: "0 4px 14px rgba(43, 27, 20, 0.06)",
                  transition: "all 0.2s ease",
                  padding: "20px",
                }}
              >
                {/* Customer Header Row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "14px",
                    borderBottom: "1px solid rgba(107, 30, 35, 0.12)",
                    paddingBottom: "16px",
                  }}
                >
                  <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #c98a2c, #7b1521)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.3rem",
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {(cust.customerName || "W")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0, fontSize: "1.35rem", color: "#1F140E", fontWeight: 800 }}>
                          {cust.customerName || "Walk-in Customer"}
                        </h3>
                        {cust.totalOrders > 1 ? (
                          <span className="badge badge-brass" style={{ fontSize: "0.8rem", padding: "3px 8px", fontWeight: 700 }}>
                            ⭐ Repeat Customer ({cust.totalOrders} orders)
                          </span>
                        ) : (
                          <span className="badge badge-leaf" style={{ fontSize: "0.8rem", padding: "3px 8px", fontWeight: 700 }}>
                            New Customer
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "4px", flexWrap: "wrap" }}>
                        {cust.customerPhone ? (
                          <span style={{ fontSize: "0.95rem", color: "var(--color-maroon)", fontWeight: 700 }}>
                            📞 <a href={`tel:${cust.customerPhone}`} style={{ color: "inherit", textDecoration: "none" }}>{cust.customerPhone}</a>
                            {cleanPhone.length >= 10 && (
                              <a
                                href={`https://wa.me/91${cleanPhone.slice(-10)}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  marginLeft: "8px",
                                  fontSize: "0.8rem",
                                  background: "#25D366",
                                  color: "#000",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  textDecoration: "none",
                                  fontWeight: "bold",
                                }}
                              >
                                WhatsApp
                              </a>
                            )}
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.9rem", color: "var(--color-ink-soft)", fontWeight: 600 }}>
                            In-store Walk-in
                          </span>
                        )}

                        {cust.customerAddress && (
                          <span style={{ fontSize: "0.9rem", color: "var(--color-ink-soft)", fontWeight: 600 }}>
                            📍 {cust.customerAddress}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Customer Quick Metrics */}
                  <div style={{ display: "flex", gap: "22px", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.78rem", color: "var(--color-ink-soft)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Total Spend</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-maroon)" }}>
                        ₹{cust.totalSpent?.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.78rem", color: "var(--color-ink-soft)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Last Ordered</div>
                      <div style={{ fontSize: "0.95rem", color: "#1F140E", fontWeight: 700 }}>
                        {new Date(cust.lastOrderAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* What They Bought (Itemized Breakdown) */}
                <div style={{ marginTop: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--color-maroon-deep)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      🛍️ What They Bought ({cust.purchasedItems?.length || 0} unique items)
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "var(--color-ink-soft)", fontWeight: 600 }}>
                      Aggregated quantities &amp; spend
                    </span>
                  </div>

                  {(!cust.purchasedItems || cust.purchasedItems.length === 0) ? (
                    <p style={{ fontSize: "0.9rem", color: "var(--color-ink-soft)" }}>No item details found.</p>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                        gap: "10px",
                      }}
                    >
                      {cust.purchasedItems.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: "#FFF8F0",
                            border: "1.5px solid rgba(107, 30, 35, 0.16)",
                            borderRadius: "8px",
                            padding: "10px 14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            boxShadow: "0 1px 4px rgba(43, 27, 20, 0.04)",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: "#1F140E", fontSize: "1rem" }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: "0.82rem", color: "var(--color-ink-soft)", fontWeight: 600 }}>
                              Ordered {item.orderCount} {item.orderCount === 1 ? "time" : "times"}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 800, color: "var(--color-maroon)", fontSize: "1.1rem" }}>
                              {formatWeight(item.totalGrams)}
                            </div>
                            <div style={{ fontSize: "0.85rem", color: "var(--color-ink)", fontWeight: 700 }}>
                              ₹{item.totalAmount}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expand Order History Button */}
                <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px dashed rgba(107, 30, 35, 0.18)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    className="btn btn-outline btn-small"
                    onClick={() => toggleExpand(cust.id)}
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}
                  >
                    <span>{isExpanded ? "▲ Hide Orders" : "▼ View Detailed Order History"}</span>
                    <span className="badge badge-leaf" style={{ fontSize: "0.75rem", padding: "2px 6px" }}>
                      {cust.orders?.length || 0}
                    </span>
                  </button>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-ink-soft)", fontWeight: 600 }}>
                    First purchase: {new Date(cust.firstOrderAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>

                {/* Expanded Detailed Orders Timeline */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: "16px",
                      background: "#FFFBF7",
                      borderRadius: "10px",
                      padding: "16px",
                      border: "1.5px solid rgba(201, 138, 44, 0.35)",
                    }}
                  >
                    <h4 style={{ margin: "0 0 12px 0", color: "var(--color-maroon-deep)", fontSize: "1.1rem", fontWeight: 800 }}>
                      Order History Timeline ({cust.orders?.length} orders)
                    </h4>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {cust.orders?.map((ord) => (
                        <div
                          key={ord._id}
                          style={{
                            background: "#FFFFFF",
                            borderRadius: "8px",
                            padding: "12px 16px",
                            border: "1px solid rgba(107, 30, 35, 0.14)",
                            borderLeft: "4px solid var(--color-maroon)",
                            boxShadow: "0 1px 4px rgba(43, 27, 20, 0.05)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: 800, color: "var(--color-maroon)", fontSize: "1.05rem" }}>
                                Token #{ord.tokenNumber || ord.orderNumber}
                              </span>
                              <span className={`badge ${ord.orderType === "Counter" ? "badge-brass" : "badge-leaf"}`} style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                                {ord.orderType === "Counter" ? "🔳 Counter" : "🌐 Website"}
                              </span>
                              <span className="badge" style={{ fontSize: "0.75rem", background: ord.status === "Delivered" ? "#166534" : "#854d0e", color: "#fff", fontWeight: 700 }}>
                                {ord.status}
                              </span>
                              <span className="badge" style={{ fontSize: "0.75rem", background: ord.paymentStatus === "Paid" ? "#166534" : "#991b1b", color: "#fff", fontWeight: 700 }}>
                                {ord.paymentStatus} ({ord.paymentMethod})
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <span style={{ fontSize: "0.85rem", color: "var(--color-ink-soft)", fontWeight: 600 }}>
                                {new Date(ord.createdAt).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                              <button
                                className="btn btn-brass btn-small"
                                style={{ padding: "4px 10px", fontSize: "0.8rem", fontWeight: 700 }}
                                onClick={() => printBill(ord)}
                              >
                                🖨 Bill
                              </button>
                            </div>
                          </div>

                          {/* Order items row */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px" }}>
                            {ord.items?.map((it, i) => (
                              <span
                                key={i}
                                style={{
                                  background: "#F5EFEB",
                                  border: "1px solid rgba(107, 30, 35, 0.16)",
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  fontSize: "0.85rem",
                                  color: "#1F140E",
                                  fontWeight: 700,
                                }}
                              >
                                {it.name} ({formatWeight(it.grams)}) — ₹{it.lineTotal}
                              </span>
                            ))}
                          </div>

                          <div style={{ textAlign: "right", marginTop: "8px", fontSize: "0.95rem", fontWeight: 800, color: "var(--color-maroon)" }}>
                            Order Total: ₹{ord.total}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomerHistory;
