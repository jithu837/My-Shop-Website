import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AdminLayout from "./pages/AdminLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProductManage from "./pages/ProductManage.jsx";
import OrdersManage from "./pages/OrdersManage.jsx";
import FeedbackView from "./pages/FeedbackView.jsx";
import CounterQR from "./pages/CounterQR.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<ProductManage />} />
        <Route path="orders" element={<OrdersManage />} />
        <Route path="feedback" element={<FeedbackView />} />
        <Route path="qr" element={<CounterQR />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
