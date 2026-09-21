import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";

import AdminLayout from "./pages/AdminLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProductManage from "./pages/ProductManage.jsx";
import OrdersManage from "./pages/OrdersManage.jsx";
import FeedbackView from "./pages/FeedbackView.jsx";
import CounterQR from "./pages/CounterQR.jsx";
import CustomerHistory from "./pages/CustomerHistory.jsx";

const AdminAppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#4A1418",
          color: "#FBF3E7",
          fontFamily: "var(--font-utility)",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            border: "3.5px solid rgba(231,182,92,0.3)",
            borderTopColor: "#E7B65C",
            borderRadius: "50%",
            animation: "authSpin 0.8s linear infinite",
          }}
        />
        <p style={{ marginTop: "16px", fontSize: "0.95rem", letterSpacing: "0.05em" }}>
          Verifying Owner Session...
        </p>
        <style>{`@keyframes authSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // When not logged in, show ONLY the dedicated Login dashboard
  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<ProductManage />} />
        <Route path="orders" element={<OrdersManage />} />
        <Route path="customers" element={<CustomerHistory />} />
        <Route path="feedback" element={<FeedbackView />} />
        <Route path="qr" element={<CounterQR />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <AdminAppContent />
    </AuthProvider>
  );
}

export default App;
