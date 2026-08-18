import React, { useEffect, useState, useCallback } from "react";
import api, { imageUrl } from "../services/api.js";
import useOrderStream from "../hooks/useOrderStream.js";
import "../css/admin.css";

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [graph, setGraph] = useState([]);

  const load = useCallback(() => {
    api.get("/dashboard/summary").then((res) => setSummary(res.data));
    api.get("/dashboard/revenue-graph").then((res) => setGraph(res.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh dashboard stats whenever a new order is placed.
  useOrderStream(load);

  if (!summary) return <div className="spinner" />;

  const maxRevenue = Math.max(...graph.map((g) => g.total), 1);

  return (
    <div>
      <h1>Dashboard</h1>

      <div className="admin-stats-grid">
        <StatCard label="Today's Sales" value={summary.todaySalesCount} />
        <StatCard label="Today's Collection" value={`₹${summary.todayCollection}`} />
        <StatCard label="Monthly Collection" value={`₹${summary.monthlyCollection}`} />
        <StatCard label="Total Customers" value={summary.totalCustomers} />
        <StatCard label="Pending Orders" value={summary.pendingOrders} />
        <StatCard label="Delivered Orders" value={summary.deliveredOrders} />
        <StatCard label="Cancelled Orders" value={summary.cancelledOrders} />
        <StatCard label="Avg. Feedback Rating" value={summary.feedbackCount ? `★ ${summary.avgRating}` : "—"} />
      </div>

      <div className="admin-panel">
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
                    <td><img src={imageUrl(p.image)} alt="" /></td>
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
                  <td><img src={imageUrl(p.image)} alt="" /></td>
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

const StatCard = ({ label, value }) => (
  <div className="admin-stat-card">
    <div className="admin-stat-label">{label}</div>
    <div className="admin-stat-value">{value}</div>
  </div>
);

export default Dashboard;
