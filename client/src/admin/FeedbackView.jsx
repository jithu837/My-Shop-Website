import React, { useEffect, useState } from "react";
import api from "../services/api.js";
import "../css/admin.css";

const FeedbackView = () => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/feedback").then((res) => setFeedback(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Customer Feedback</h1>

      {loading ? (
        <div className="spinner" />
      ) : feedback.length === 0 ? (
        <p className="empty-state">No feedback received yet.</p>
      ) : (
        <div className="admin-panel">
          <table className="admin-table">
            <thead><tr><th>Customer</th><th>Product</th><th>Rating</th><th>Message</th><th>Date</th></tr></thead>
            <tbody>
              {feedback.map((f) => (
                <tr key={f._id}>
                  <td>{f.customerName}{f.customerPhone && <><br /><small>{f.customerPhone}</small></>}</td>
                  <td>{f.product?.name || "—"}</td>
                  <td>{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</td>
                  <td style={{ whiteSpace: "normal", maxWidth: 320 }}>{f.message || "—"}</td>
                  <td>{new Date(f.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FeedbackView;
