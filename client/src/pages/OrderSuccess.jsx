import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api.js";
import printBill from "../utils/printBill.js";
import "../css/invoice.css";

const OrderSuccess = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders/${id}`).then((res) => setOrder(res.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="spinner" />;
  if (!order) return <p className="empty-state">Order not found.</p>;

  return (
    <section className="section">
      <div className="container">
        <div className="invoice-success-banner">
          <span className="invoice-success-icon">✓</span>
          <div>
            <h2>Order placed successfully!</h2>
            <p>Your order number is <strong>{order.orderNumber}</strong></p>
          </div>
        </div>

        <div className="card invoice" id="invoice-print">
          <div className="invoice-header">
            <div>
              <h3>Chamundeshwari Home Sweets &amp; Hots</h3>
              <p>Invoice / Order Receipt</p>
            </div>
            <div className="invoice-header-right">
              <div><strong>Order #</strong> {order.orderNumber}</div>
              <div><strong>Date</strong> {new Date(order.createdAt).toLocaleString("en-IN")}</div>
              <div><strong>Payment</strong> {order.paymentMethod} · {order.paymentStatus}</div>
            </div>
          </div>

          <div className="invoice-customer">
            <div><strong>Billed to:</strong> {order.customerName}</div>
            <div>{order.customerPhone}</div>
            <div>{order.customerAddress}</div>
          </div>

          <table className="invoice-table">
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Rate / kg</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i}>
                  <td>{item.name}</td>
                  <td>{item.grams}g</td>
                  <td>₹{item.pricePerKg}</td>
                  <td>₹{item.lineTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="invoice-totals">
            <div><span>Subtotal</span><span>₹{order.subtotal}</span></div>
            {order.discount > 0 && <div><span>Discount ({order.couponCode})</span><span>−₹{order.discount}</span></div>}
            <div className="invoice-grand-total"><span>Total</span><span>₹{order.total}</span></div>
          </div>

<p className="invoice-footer">Thank you for ordering from Chamundeshwari Home Sweets &amp; Hots!</p>
        </div>

        <div className="invoice-actions">
          <button className="btn btn-brass" onClick={() => printBill(order)}>Print Bill</button>
          <Link to="/products" className="btn btn-outline">Continue Shopping</Link>
        </div>
      </div>
    </section>
  );
};

export default OrderSuccess;
